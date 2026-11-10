import os
import cv2
import base64
import datetime
import asyncio
from typing import Optional, Any
from bson import ObjectId
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, Form, UploadFile, File, status
import mediapipe as mp

from app.database import get_db
from app.config import settings
from app.utils.dependencies import get_current_user, parse_object_id
from app.utils.errors import APIError
from app.utils.rate_limit import frame_rate_limiter
from app.services.vision_service import (
    VisionModelManager,
    compute_raw_geometry,
    build_overlay,
    draw_mesh_annotations
)
from app.services.fusion_service import evaluate_late_fusion
from app.services.session_registry import session_registry
from app.schemas.session import (
    StartMonitoringRequest,
    StartMonitoringResponse,
    SessionSchema,
    SessionResponse,
    SessionActionRequest
)
from app.schemas.telemetry import (
    FrameResponse,
    Telemetry,
    TelemetryMetrics,
    TelemetryComponents,
    TelemetryResponse,
    AnalyzeImageResponse,
    AnalyzeImageMetrics
)

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

def to_utc(dt: Any) -> datetime.datetime:
    if not isinstance(dt, datetime.datetime):
        return datetime.datetime.now(datetime.timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=datetime.timezone.utc)
    return dt.astimezone(datetime.timezone.utc)

def format_session_doc(doc: dict) -> SessionSchema:
    return SessionSchema(
        id=str(doc["_id"]),
        status=doc.get("status", "completed"),
        source=doc.get("source", "browser_camera"),
        eeg_source=doc.get("eeg_source", "simulated_csv"),
        started_at=to_utc(doc["started_at"]).isoformat() if doc.get("started_at") else "",
        ended_at=to_utc(doc["ended_at"]).isoformat() if doc.get("ended_at") else None,
        duration_seconds=doc.get("duration_seconds"),
        active_duration_seconds=doc.get("active_duration_seconds"),
        moments_count=doc.get("moments_count", 0),
        summary=doc.get("summary"),
        aggregated_metrics=doc.get("aggregated_metrics"),
        created_at=to_utc(doc["created_at"]).isoformat() if doc.get("created_at") else ""
    )

@router.post("/start", response_model=StartMonitoringResponse, status_code=status.HTTP_201_CREATED)
async def start_monitoring(
    payload: StartMonitoringRequest,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    user_id = current_user["_id"]

    # Check for live session
    live = await db.monitoring_sessions.find_one({"user_id": user_id, "is_live": True})
    if live:
        # Check if abandoned (>120s without heartbeat)
        now = datetime.datetime.now(datetime.timezone.utc)
        raw_hb = live.get("last_heartbeat_at", live.get("started_at"))
        last_hb = to_utc(raw_hb)
        if (now - last_hb).total_seconds() > settings.SESSION_IDLE_SECONDS:
            await db.monitoring_sessions.update_one(
                {"_id": live["_id"]},
                {"$set": {"status": "abandoned", "is_live": False, "ended_at": now}}
            )
            session_registry.remove(str(live["_id"]))
        else:
            raise APIError(
                status_code=409,
                code="session_already_live",
                message="You already have an active monitoring session.",
                details={"session_id": str(live["_id"])}
            )

    now = datetime.datetime.now(datetime.timezone.utc)
    session_doc = {
        "user_id": user_id,
        "status": "active",
        "is_live": True,
        "source": payload.source,
        "eeg_source": payload.eeg_source,
        "started_at": now,
        "ended_at": None,
        "paused_total_seconds": 0.0,
        "paused_at": None,
        "duration_seconds": None,
        "active_duration_seconds": None,
        "moments_count": 0,
        "summary": None,
        "aggregated_metrics": None,
        "last_heartbeat_at": now,
        "created_at": now,
        "updated_at": now
    }

    result = await db.monitoring_sessions.insert_one(session_doc)
    session_doc["_id"] = result.inserted_id
    sid_str = str(result.inserted_id)

    # Initialize in-memory session registry
    session_registry.create(sid_str, str(user_id))

    return StartMonitoringResponse(session=format_session_doc(session_doc))

@router.post("/frame", response_model=FrameResponse)
async def process_frame(
    session_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    frame_rate_limiter.check(f"frame_{session_id}")

    session_oid = parse_object_id(session_id)
    db = get_db()
    user_id = current_user["_id"]

    session_doc = await db.monitoring_sessions.find_one({"_id": session_oid, "user_id": user_id})
    if not session_doc:
        raise APIError(status_code=404, code="not_found", message="Session not found or not owned by user.")

    if session_doc.get("status") != "active":
        raise APIError(status_code=409, code="session_not_active", message="Session is paused or ended.")

    reg_state = session_registry.get(session_id)
    if not reg_state:
        # Re-attach to registry if missing
        reg_state = session_registry.create(session_id, str(user_id))

    contents = await file.read()
    if len(contents) > settings.MAX_FRAME_BYTES:
        raise APIError(status_code=413, code="payload_too_large", message="Frame payload exceeds 500 KB.")

    np_arr = np.frombuffer(contents, np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise APIError(status_code=400, code="bad_request", message="Could not decode frame image.")

    # Server flips horizontally for mirrored coordinates
    frame_flipped = cv2.flip(img_bgr, 1)
    rgb_frame = cv2.cvtColor(frame_flipped, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

    vm = VisionModelManager.get_instance()
    detection_result = await asyncio.to_thread(vm.detect_landmarks, mp_image)

    # Advance EEG if 1 second has elapsed
    reg_state.eeg_simulator.tick_if_needed()
    eeg_current = reg_state.eeg_simulator.current_eeg_prob
    eeg_raw = reg_state.eeg_simulator.latest_raw_prob
    eeg_calibrated = reg_state.eeg_simulator.latest_calibrated_prob
    at_ratio = reg_state.eeg_simulator.latest_at_ratio
    beta_power = reg_state.eeg_simulator.latest_beta_power

    # Throttled heartbeat update in DB every 15 seconds
    now = datetime.datetime.now(datetime.timezone.utc)
    if (now - reg_state.last_heartbeat_at).total_seconds() > 15:
        await db.monitoring_sessions.update_one(
            {"_id": session_oid},
            {"$set": {"last_heartbeat_at": now}}
        )

    if not detection_result.face_landmarks:
        reg_state.record_frame(has_face=False)
        telemetry_obj = Telemetry(**reg_state.latest_telemetry) if reg_state.latest_telemetry else None
        return FrameResponse(
            session_id=session_id,
            face_detected=False,
            telemetry=telemetry_obj,
            overlay=None
        )

    landmarks = detection_result.face_landmarks[0]
    feat_dict, ear, is_closed = reg_state.vision_extractor.extract_features(landmarks)
    vis_prob, rf_vis_prob, kinematic_stillness = reg_state.vision_extractor.score(feat_dict)

    fused_state, fused_code, is_mismatch = evaluate_late_fusion(vis_prob, eeg_current)
    overlay_dict = build_overlay(landmarks)

    telemetry_data = {
        "timestamp": now.isoformat(),
        "vision_score": round(vis_prob, 3),
        "eeg_score": round(eeg_current, 3) if reg_state.eeg_simulator.has_inference else None,
        "fused_state": fused_state,
        "fused_code": fused_code,
        "discrepancy_alert": is_mismatch,
        "eeg_source": "simulated_csv",
        "metrics": {
            "gaze_stability": round(feat_dict["gaze_stability"], 4),
            "head_stability": round(feat_dict["head_stability"], 4),
            "rolling_blinks": int(feat_dict["rolling_blinks"]),
            "ear": round(ear, 3),
            "alpha_theta_ratio": at_ratio,
            "beta_power": beta_power
        },
        "components": {
            "vision_rf_prob": round(rf_vis_prob, 3),
            "vision_kinematic_stillness": round(kinematic_stillness, 3),
            "eeg_rf_prob_raw": eeg_raw,
            "eeg_calibrated_prob": eeg_calibrated
        }
    }

    reg_state.record_frame(has_face=True, telemetry=telemetry_data)

    return FrameResponse(
        session_id=session_id,
        face_detected=True,
        telemetry=Telemetry(**telemetry_data),
        overlay=overlay_dict
    )

@router.get("/telemetry", response_model=TelemetryResponse)
async def get_latest_telemetry(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    session_oid = parse_object_id(session_id)
    db = get_db()
    session_doc = await db.monitoring_sessions.find_one({"_id": session_oid, "user_id": current_user["_id"]})
    if not session_doc:
        raise APIError(status_code=404, code="not_found", message="Session not found.")

    reg_state = session_registry.get(session_id)
    telemetry_obj = Telemetry(**reg_state.latest_telemetry) if (reg_state and reg_state.latest_telemetry) else None

    return TelemetryResponse(
        session_id=session_id,
        status=session_doc.get("status", "completed"),
        telemetry=telemetry_obj
    )

@router.post("/pause", response_model=SessionResponse)
async def pause_monitoring(
    payload: SessionActionRequest,
    current_user: dict = Depends(get_current_user)
):
    session_oid = parse_object_id(payload.session_id)
    db = get_db()
    session_doc = await db.monitoring_sessions.find_one({"_id": session_oid, "user_id": current_user["_id"]})
    if not session_doc:
        raise APIError(status_code=404, code="not_found", message="Session not found.")
    if session_doc.get("status") != "active":
        raise APIError(status_code=409, code="session_not_active", message="Only active sessions can be paused.")

    now = datetime.datetime.now(datetime.timezone.utc)
    reg_state = session_registry.get(payload.session_id)
    if reg_state:
        reg_state.pause()

    await db.monitoring_sessions.update_one(
        {"_id": session_oid},
        {"$set": {"status": "paused", "paused_at": now, "updated_at": now}}
    )

    updated = await db.monitoring_sessions.find_one({"_id": session_oid})
    return SessionResponse(session=format_session_doc(updated))

@router.post("/resume", response_model=SessionResponse)
async def resume_monitoring(
    payload: SessionActionRequest,
    current_user: dict = Depends(get_current_user)
):
    session_oid = parse_object_id(payload.session_id)
    db = get_db()
    session_doc = await db.monitoring_sessions.find_one({"_id": session_oid, "user_id": current_user["_id"]})
    if not session_doc:
        raise APIError(status_code=404, code="not_found", message="Session not found.")
    if session_doc.get("status") != "paused":
        raise APIError(status_code=409, code="session_not_active", message="Only paused sessions can be resumed.")

    now = datetime.datetime.now(datetime.timezone.utc)
    raw_paused = session_doc.get("paused_at")
    paused_at = to_utc(raw_paused) if raw_paused else now
    pause_delta = (now - paused_at).total_seconds()
    new_total_paused = (session_doc.get("paused_total_seconds") or 0.0) + pause_delta

    reg_state = session_registry.get(payload.session_id)
    if reg_state:
        reg_state.resume()

    await db.monitoring_sessions.update_one(
        {"_id": session_oid},
        {"$set": {
            "status": "active",
            "paused_at": None,
            "paused_total_seconds": new_total_paused,
            "last_heartbeat_at": now,
            "updated_at": now
        }}
    )

    updated = await db.monitoring_sessions.find_one({"_id": session_oid})
    return SessionResponse(session=format_session_doc(updated))

@router.post("/stop", response_model=SessionResponse)
async def stop_monitoring(
    payload: SessionActionRequest,
    current_user: dict = Depends(get_current_user)
):
    session_oid = parse_object_id(payload.session_id)
    db = get_db()
    session_doc = await db.monitoring_sessions.find_one({"_id": session_oid, "user_id": current_user["_id"]})
    if not session_doc:
        raise APIError(status_code=404, code="not_found", message="Session not found.")

    if session_doc.get("status") == "completed":
        return SessionResponse(session=format_session_doc(session_doc))

    now = datetime.datetime.now(datetime.timezone.utc)
    reg_state = session_registry.get(payload.session_id)

    if reg_state:
        summary, aggregated_metrics = reg_state.compute_summary_and_aggregates(now)
        duration_sec, active_sec = reg_state.get_durations(now)
        session_registry.remove(payload.session_id)
    else:
        started_at = to_utc(session_doc.get("started_at"))
        duration_sec = int((now - started_at).total_seconds())
        active_sec = max(0, duration_sec - int(session_doc.get("paused_total_seconds", 0)))
        summary = session_doc.get("summary")
        aggregated_metrics = session_doc.get("aggregated_metrics")

    await db.monitoring_sessions.update_one(
        {"_id": session_oid},
        {"$set": {
            "status": "completed",
            "is_live": False,
            "ended_at": now,
            "duration_seconds": duration_sec,
            "active_duration_seconds": active_sec,
            "summary": summary,
            "aggregated_metrics": aggregated_metrics,
            "updated_at": now
        }}
    )

    updated = await db.monitoring_sessions.find_one({"_id": session_oid})
    return SessionResponse(session=format_session_doc(updated))

@router.post("/analyze-image", response_model=AnalyzeImageResponse)
async def analyze_uploaded_image(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    contents = await file.read()
    if len(contents) > settings.MAX_IMAGE_BYTES:
        raise APIError(status_code=413, code="payload_too_large", message="Image file exceeds 4 MB.")

    np_arr = np.frombuffer(contents, np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise APIError(status_code=400, code="bad_request", message="Invalid image file.")

    rgb_frame = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

    vm = VisionModelManager.get_instance()
    detection_result = await asyncio.to_thread(vm.detect_landmarks, mp_image)

    if not detection_result.face_landmarks:
        raise APIError(status_code=422, code="no_face_detected", message="No face detected in the uploaded image.")

    landmarks = detection_result.face_landmarks[0]
    raw_ear, raw_gx, raw_gy, raw_rx, raw_ry, raw_rz = compute_raw_geometry(landmarks)

    is_closed = raw_ear < 0.21
    au45_c = 1.0 if is_closed else 0.0
    au45_r = float(np.clip((0.28 - raw_ear) * 18.0, 0.0, 5.0))

    gaze_dev = float(abs(raw_gx) + abs(raw_gy)) * 0.25
    head_dev = float(abs(raw_rx) + abs(raw_ry) + abs(raw_rz) * 0.5) * 0.25

    static_features = {
        'gaze_angle_x': float(raw_gx),
        'gaze_angle_y': float(raw_gy),
        'pose_Rx': float(raw_rx),
        'pose_Ry': float(raw_ry),
        'pose_Rz': float(raw_rz),
        'AU45_r': au45_r,
        'AU45_c': au45_c,
        'gaze_stability': gaze_dev,
        'head_stability': head_dev,
        'rolling_blinks': au45_c
    }

    X_static = pd.DataFrame([static_features])[vm.vision_model.feature_names_in_]
    rf_prob = float(vm.vision_model.predict_proba(X_static)[0][1])

    alignment_score = float(np.exp(-12.0 * (gaze_dev + head_dev)))
    if is_closed:
        alignment_score *= 0.35

    final_vis_score = round(float(np.clip(0.45 * rf_prob + 0.55 * alignment_score, 0.02, 0.99)), 3)

    eeg_score = None
    eeg_source = None
    fused_state = None
    fused_code = None
    discrepancy_alert = False

    if session_id:
        reg_state = session_registry.get(session_id)
        if reg_state and reg_state.eeg_simulator.has_inference:
            eeg_score = reg_state.eeg_simulator.current_eeg_prob
            eeg_source = "simulated_csv"
            fused_state, fused_code, discrepancy_alert = evaluate_late_fusion(final_vis_score, eeg_score)

    draw_mesh_annotations(img_bgr, landmarks, is_still=(final_vis_score >= 0.50))
    _, buffer = cv2.imencode('.jpg', img_bgr)
    b64_img = base64.b64encode(buffer).decode('utf-8')

    return AnalyzeImageResponse(
        annotated_image=f"data:image/jpeg;base64,{b64_img}",
        vision_score=final_vis_score,
        eeg_score=eeg_score,
        eeg_source=eeg_source,
        fused_state=fused_state,
        fused_code=fused_code,
        discrepancy_alert=discrepancy_alert,
        metrics=AnalyzeImageMetrics(
            ear=round(raw_ear, 3),
            gaze_angle_x=round(raw_gx, 4),
            gaze_angle_y=round(raw_gy, 4),
            pose_Rx=round(raw_rx, 4),
            pose_Ry=round(raw_ry, 4),
            pose_Rz=round(raw_rz, 4),
            gaze_deviation=round(gaze_dev, 4),
            head_deviation=round(head_dev, 4),
            eye_status="Closed / Blink (AU45)" if is_closed else "Open & Fixated"
        ),
        method_note="Single-frame heuristic estimate; rolling-window features are approximated."
    )

