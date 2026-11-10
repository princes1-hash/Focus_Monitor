import re
import datetime
import base64
from typing import Optional, List, Dict, Any
from bson import ObjectId, Binary
from fastapi import APIRouter, Depends, Header, Response, Query, status
from fastapi.responses import Response as FastApiResponse

from app.database import get_db
from app.config import settings
from app.utils.dependencies import get_current_user, parse_object_id
from app.utils.errors import APIError
from app.services.session_registry import session_registry
from app.schemas.moment import (
    CreateMomentRequest,
    MomentSchema,
    MomentResponse,
    MomentListResponse
)

router = APIRouter(prefix="/api/moments", tags=["moments"])

def format_moment_doc(doc: dict) -> MomentSchema:
    has_img = bool(doc.get("image"))
    mid = str(doc["_id"])
    return MomentSchema(
        id=mid,
        session_id=str(doc.get("session_id")),
        timestamp=doc["timestamp"].isoformat() if isinstance(doc.get("timestamp"), datetime.datetime) else str(doc.get("timestamp")),
        fused_state=doc.get("fused_state", "Unknown"),
        fused_code=doc.get("fused_code", "both_low"),
        vision_score=doc.get("vision_score"),
        eeg_score=doc.get("eeg_score"),
        discrepancy_alert=doc.get("discrepancy_alert", False),
        eeg_source=doc.get("eeg_source", "simulated_csv"),
        metrics=doc.get("metrics", {}),
        note=doc.get("note"),
        has_image=has_img,
        image_url=f"/api/moments/{mid}/image" if has_img else None,
        created_at=doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime.datetime) else str(doc.get("created_at"))
    )

@router.post("", response_model=MomentResponse, status_code=status.HTTP_201_CREATED)
async def create_moment(
    payload: CreateMomentRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: dict = Depends(get_current_user)
):
    if not idempotency_key:
        raise APIError(status_code=400, code="bad_request", message="Header 'Idempotency-Key' is required.")

    db = get_db()
    user_id = current_user["_id"]

    # Check idempotency
    existing = await db.captured_moments.find_one({"user_id": user_id, "idempotency_key": idempotency_key})
    if existing:
        return Response(
            content=MomentResponse(moment=format_moment_doc(existing)).model_dump_json(),
            media_type="application/json",
            status_code=status.HTTP_200_OK
        )

    session_oid = parse_object_id(payload.session_id)
    session_doc = await db.monitoring_sessions.find_one({"_id": session_oid, "user_id": user_id})
    if not session_doc:
        raise APIError(status_code=404, code="not_found", message="Session not found or not owned by user.")

    if session_doc.get("status") not in ["active", "paused"]:
        raise APIError(status_code=409, code="session_not_active", message="Cannot capture moment on an ended session.")

    reg_state = session_registry.get(payload.session_id)
    telemetry = reg_state.latest_telemetry if reg_state else None
    if not telemetry:
        raise APIError(status_code=409, code="no_telemetry_yet", message="No telemetry recorded for this session yet.")

    # Image processing
    image_dict = None
    if payload.image_base64:
        user_prefs = current_user.get("preferences", {})
        if not user_prefs.get("store_frames", False):
            raise APIError(
                status_code=403,
                code="image_storage_disabled",
                message="Image storage is disabled in your account privacy preferences."
            )

        try:
            b64_data = payload.image_base64
            if "," in b64_data:
                b64_data = b64_data.split(",", 1)[1]
            img_bytes = base64.b64decode(b64_data)
        except Exception:
            raise APIError(status_code=400, code="bad_request", message="Invalid image base64 data.")

        if len(img_bytes) > settings.MAX_MOMENT_IMAGE_BYTES:
            raise APIError(status_code=413, code="payload_too_large", message="Snapshot image exceeds 300 KB limit.")

        # Validate JPEG magic bytes: FF D8 FF
        if not (img_bytes.startswith(b'\xff\xd8\xff') or img_bytes.startswith(b'\x89PNG')):
            raise APIError(status_code=415, code="unsupported_media_type", message="Snapshot must be a JPEG or PNG image.")

        image_dict = {
            "content_type": "image/jpeg",
            "size_bytes": len(img_bytes),
            "data": Binary(img_bytes)
        }

    now = datetime.datetime.now(datetime.timezone.utc)
    moment_doc = {
        "user_id": user_id,
        "session_id": session_oid,
        "timestamp": now,
        "fused_state": telemetry.get("fused_state", "Unknown"),
        "fused_code": telemetry.get("fused_code", "both_low"),
        "vision_score": telemetry.get("vision_score"),
        "eeg_score": telemetry.get("eeg_score"),
        "discrepancy_alert": telemetry.get("discrepancy_alert", False),
        "eeg_source": telemetry.get("eeg_source", "simulated_csv"),
        "metrics": telemetry.get("metrics", {}),
        "note": payload.note,
        "image": image_dict,
        "idempotency_key": idempotency_key,
        "created_at": now
    }

    result = await db.captured_moments.insert_one(moment_doc)
    moment_doc["_id"] = result.inserted_id

    # Increment moments_count in session
    await db.monitoring_sessions.update_one(
        {"_id": session_oid},
        {"$inc": {"moments_count": 1}}
    )

    return MomentResponse(moment=format_moment_doc(moment_doc))

@router.get("", response_model=MomentListResponse)
async def list_moments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("newest"),
    session_id: Optional[str] = Query(None),
    date_from: Optional[datetime.datetime] = Query(None, alias="from"),
    date_to: Optional[datetime.datetime] = Query(None, alias="to"),
    q: Optional[str] = Query(None),
    fused_code: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    user_id = current_user["_id"]

    query: Dict[str, Any] = {"user_id": user_id}

    if session_id:
        query["session_id"] = parse_object_id(session_id)

    if fused_code:
        query["fused_code"] = fused_code

    if date_from or date_to:
        query["timestamp"] = {}
        if date_from:
            query["timestamp"]["$gte"] = date_from
        if date_to:
            query["timestamp"]["$lte"] = date_to

    if q:
        safe_q = re.escape(q.strip())
        query["$or"] = [
            {"fused_state": {"$regex": safe_q, "$options": "i"}},
            {"note": {"$regex": safe_q, "$options": "i"}}
        ]

    sort_order = -1 if sort == "newest" else 1

    total = await db.captured_moments.count_documents(query)
    total_pages = max(1, (total + page_size - 1) // page_size)

    # Exclude image.data for list performance
    cursor = db.captured_moments.find(query, {"image.data": 0})\
        .sort("timestamp", sort_order)\
        .skip((page - 1) * page_size)\
        .limit(page_size)

    docs = await cursor.to_list(length=page_size)
    items = [format_moment_doc(d) for d in docs]

    return MomentListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages
    )

@router.get("/{moment_id}", response_model=MomentResponse)
async def get_moment(
    moment_id: str,
    current_user: dict = Depends(get_current_user)
):
    m_oid = parse_object_id(moment_id)
    db = get_db()
    doc = await db.captured_moments.find_one({"_id": m_oid, "user_id": current_user["_id"]}, {"image.data": 0})
    if not doc:
        raise APIError(status_code=404, code="not_found", message="Moment not found.")

    return MomentResponse(moment=format_moment_doc(doc))

@router.get("/{moment_id}/image")
async def get_moment_image(
    moment_id: str,
    current_user: dict = Depends(get_current_user)
):
    m_oid = parse_object_id(moment_id)
    db = get_db()
    doc = await db.captured_moments.find_one({"_id": m_oid, "user_id": current_user["_id"]})
    if not doc or not doc.get("image") or not doc["image"].get("data"):
        raise APIError(status_code=404, code="not_found", message="Image not found for this moment.")

    img_data = doc["image"]["data"]
    return FastApiResponse(
        content=bytes(img_data),
        media_type=doc["image"].get("content_type", "image/jpeg"),
        headers={"Cache-Control": "private, max-age=3600"}
    )

@router.delete("/{moment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_moment(
    moment_id: str,
    current_user: dict = Depends(get_current_user)
):
    m_oid = parse_object_id(moment_id)
    db = get_db()
    doc = await db.captured_moments.find_one({"_id": m_oid, "user_id": current_user["_id"]})
    if not doc:
        raise APIError(status_code=404, code="not_found", message="Moment not found.")

    session_id = doc.get("session_id")
    await db.captured_moments.delete_one({"_id": m_oid})

    if session_id:
        await db.monitoring_sessions.update_one(
            {"_id": session_id, "moments_count": {"$gt": 0}},
            {"$inc": {"moments_count": -1}}
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)

