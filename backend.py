import os
import cv2
import time
import math
import base64
import urllib.request
import joblib
import numpy as np
import pandas as pd
from collections import deque
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

app = FastAPI(title="Ocular & Cognitive Focus Monitor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Load Pre-Trained Models & Mock EEG Stream
print("Loading trained Random Forest models...")
vision_model = joblib.load("vision_model.joblib")
eeg_model = joblib.load("eeg_model.joblib")
eeg_stream_df = pd.read_csv("mock_eeg_stream.csv")
eeg_feature_cols = ['theta_power', 'alpha_power', 'beta_power', 'alpha_theta_ratio', 'alpha_beta_ratio']

# 2. Load MediaPipe FaceLandmarker Model
MODEL_PATH = "face_landmarker.task"
if not os.path.exists(MODEL_PATH):
    url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    urllib.request.urlretrieve(url, MODEL_PATH)

base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
options = mp_vision.FaceLandmarkerOptions(
    base_options=base_options,
    num_faces=1,
    min_face_detection_confidence=0.5,
    min_face_presence_confidence=0.5,
    min_tracking_confidence=0.5
)
face_landmarker = mp_vision.FaceLandmarker.create_from_options(options)

# ==========================================================
# MEDIAPIPE FULL BOUNDING LANDMARK CONTOURS
# ==========================================================
LEFT_EYE_CONTOUR = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
RIGHT_EYE_CONTOUR = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
LEFT_IRIS_RING = [469, 470, 471, 472]
RIGHT_IRIS_RING = [474, 475, 476, 477]
FACE_OVAL_CONTOUR = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
]

# 3. Rolling Buffers & EMA Smoothing Filter for Live Stream
gaze_x_buf = deque(maxlen=30)
gaze_y_buf = deque(maxlen=30)
pose_rx_buf = deque(maxlen=30)
pose_ry_buf = deque(maxlen=30)
blink_buf = deque(maxlen=90)

ema_state = {
    "gx": None, "gy": None, "rx": None, "ry": None, "rz": None, "ear": 0.30
}
EMA_ALPHA = 0.25
was_eye_closed = False

telemetry_state = {
    "vision_score": 0.85,
    "eeg_score": 0.75,
    "fused_state": "Initializing...",
    "discrepancy_alert": False,
    "metrics": {
        "gaze_stability": 0.0,
        "head_stability": 0.0,
        "rolling_blinks": 0,
        "ear": 0.30,
        "alpha_theta_ratio": 1.0,
        "beta_power": 0.0
    }
}

def calculate_ear(landmarks, indices):
    p1 = np.array([landmarks[indices[0]].x, landmarks[indices[0]].y])
    p2 = np.array([landmarks[indices[1]].x, landmarks[indices[1]].y])
    p3 = np.array([landmarks[indices[2]].x, landmarks[indices[2]].y])
    p4 = np.array([landmarks[indices[3]].x, landmarks[indices[3]].y])
    p5 = np.array([landmarks[indices[4]].x, landmarks[indices[4]].y])
    p6 = np.array([landmarks[indices[5]].x, landmarks[indices[5]].y])

    v1 = np.linalg.norm(p2 - p6)
    v2 = np.linalg.norm(p3 - p5)
    horiz = np.linalg.norm(p1 - p4)
    return float((v1 + v2) / (2.0 * horiz + 1e-6))

def smooth_val(key, new_val):
    if ema_state[key] is None:
        ema_state[key] = new_val
    else:
        ema_state[key] = EMA_ALPHA * new_val + (1.0 - EMA_ALPHA) * ema_state[key]
    return ema_state[key]

def compute_raw_geometry(landmarks):
    """Computes raw EAR, Gaze Angles (x, y), and 3D Head Pose (Rx, Ry, Rz) from landmarks."""
    left_ear_idx = [33, 160, 158, 133, 153, 144]
    right_ear_idx = [362, 385, 387, 263, 373, 380]
    raw_ear = (calculate_ear(landmarks, left_ear_idx) + calculate_ear(landmarks, right_ear_idx)) / 2.0

    left_iris = landmarks[468] if len(landmarks) > 468 else landmarks[33]
    left_inner, left_outer = landmarks[133], landmarks[33]
    eye_width = abs(left_inner.x - left_outer.x) + 1e-6
    eye_cx = (left_inner.x + left_outer.x) / 2.0
    eye_cy = (left_inner.y + left_outer.y) / 2.0

    raw_gx = ((left_iris.x - eye_cx) / eye_width) * 0.35
    raw_gy = ((left_iris.y - eye_cy) / eye_width) * 0.35

    nose = landmarks[1]
    forehead = landmarks[10]
    chin = landmarks[152]
    left_cheek = landmarks[234]
    right_cheek = landmarks[454]

    face_h = abs(chin.y - forehead.y) + 1e-6
    face_w = abs(right_cheek.x - left_cheek.x) + 1e-6

    raw_rx = ((nose.y - (forehead.y + chin.y) / 2.0) / face_h) * 0.4
    raw_ry = ((nose.x - (left_cheek.x + right_cheek.x) / 2.0) / face_w) * 0.4
    raw_rz = math.atan2(right_cheek.y - left_cheek.y, right_cheek.x - left_cheek.x) * 0.4

    return raw_ear, raw_gx, raw_gy, raw_rx, raw_ry, raw_rz

def extract_vision_features(landmarks):
    """Extracts & smooths live video features across rolling windows."""
    global was_eye_closed
    raw_ear, raw_gx, raw_gy, raw_rx, raw_ry, raw_rz = compute_raw_geometry(landmarks)

    ear = smooth_val("ear", raw_ear)
    is_closed = raw_ear < 0.22
    blink_event = 1.0 if (is_closed and not was_eye_closed) else 0.0
    was_eye_closed = is_closed

    au45_c = 1.0 if is_closed else 0.0
    au45_r = float(np.clip((0.28 - raw_ear) * 18.0, 0.0, 5.0))

    gaze_angle_x = float(smooth_val("gx", raw_gx))
    gaze_angle_y = float(smooth_val("gy", raw_gy))
    pose_Rx = float(smooth_val("rx", raw_rx))
    pose_Ry = float(smooth_val("ry", raw_ry))
    pose_Rz = float(smooth_val("rz", raw_rz))

    gaze_x_buf.append(gaze_angle_x)
    gaze_y_buf.append(gaze_angle_y)
    pose_rx_buf.append(pose_Rx)
    pose_ry_buf.append(pose_Ry)
    blink_buf.append(blink_event)

    gaze_stability = float(np.std(gaze_x_buf) + np.std(gaze_y_buf)) if len(gaze_x_buf) > 4 else 0.0
    head_stability = float(np.std(pose_rx_buf) + np.std(pose_ry_buf)) if len(pose_rx_buf) > 4 else 0.0
    rolling_blinks = float(np.sum(blink_buf))

    feature_dict = {
        'gaze_angle_x': gaze_angle_x,
        'gaze_angle_y': gaze_angle_y,
        'pose_Rx': pose_Rx,
        'pose_Ry': pose_Ry,
        'pose_Rz': pose_Rz,
        'AU45_r': au45_r,
        'AU45_c': au45_c,
        'gaze_stability': gaze_stability,
        'head_stability': head_stability,
        'rolling_blinks': rolling_blinks
    }
    return feature_dict, ear

def draw_mesh_annotations(frame, landmarks, is_still):
    """Draws full eye contours, iris circles, head oval mesh, and 3D bounding box."""
    h, w, _ = frame.shape

    def to_px(idx_list):
        return np.array([[int(landmarks[i].x * w), int(landmarks[i].y * h)] for i in idx_list], np.int32)

    oval_pts = to_px(FACE_OVAL_CONTOUR)
    head_color = (180, 255, 100) if is_still else (80, 120, 255)
    cv2.polylines(frame, [oval_pts], isClosed=True, color=head_color, thickness=1, lineType=cv2.LINE_AA)
    for (x, y) in oval_pts[::2]:
        cv2.circle(frame, (x, y), 2, head_color, -1, lineType=cv2.LINE_AA)

    x_min, y_min = np.min(oval_pts, axis=0) - 12
    x_max, y_max = np.max(oval_pts, axis=0) + 12
    L = 18
    for (cx, cy, dx, dy) in [(x_min, y_min, 1, 1), (x_max, y_min, -1, 1), (x_min, y_max, 1, -1), (x_max, y_max, -1, -1)]:
        cv2.line(frame, (cx, cy), (cx + dx * L, cy), head_color, 2)
        cv2.line(frame, (cx, cy), (cx, cy + dy * L), head_color, 2)

    left_eye_pts = to_px(LEFT_EYE_CONTOUR)
    right_eye_pts = to_px(RIGHT_EYE_CONTOUR)
    cv2.polylines(frame, [left_eye_pts], isClosed=True, color=(255, 220, 0), thickness=1, lineType=cv2.LINE_AA)
    cv2.polylines(frame, [right_eye_pts], isClosed=True, color=(255, 220, 0), thickness=1, lineType=cv2.LINE_AA)

    for (x, y) in np.vstack((left_eye_pts[::2], right_eye_pts[::2])):
        cv2.circle(frame, (x, y), 1, (255, 255, 255), -1)

    if len(landmarks) > 477:
        l_iris_pts = to_px(LEFT_IRIS_RING)
        r_iris_pts = to_px(RIGHT_IRIS_RING)
        cv2.polylines(frame, [l_iris_pts], isClosed=True, color=(0, 255, 150), thickness=1, lineType=cv2.LINE_AA)
        cv2.polylines(frame, [r_iris_pts], isClosed=True, color=(0, 255, 150), thickness=1, lineType=cv2.LINE_AA)

        for c_idx in [468, 473]:
            px, py = int(landmarks[c_idx].x * w), int(landmarks[c_idx].y * h)
            cv2.circle(frame, (px, py), 2, (0, 255, 0), -1)

    n_bridge = (int(landmarks[168].x * w), int(landmarks[168].y * h))
    n_tip = (int(landmarks[1].x * w), int(landmarks[1].y * h))
    cv2.line(frame, n_bridge, n_tip, (255, 180, 0), 2, lineType=cv2.LINE_AA)
    cv2.circle(frame, n_tip, 3, (0, 220, 255), -1)

def evaluate_late_fusion(vis_prob, eeg_prob):
    vis_focused = vis_prob >= 0.50
    eeg_focused = eeg_prob >= 0.50

    if vis_focused and eeg_focused:
        return "True Meditative Stillness", False
    elif not vis_focused and not eeg_focused:
        return "Attentional Drift (Restless)", False
    elif vis_focused and not eeg_focused:
        return "Unverified / Mismatch: Cognitive Wandering (Eyes Still, Mind Active)", True
    else:
        return "Unverified / Mismatch: Physical Fidgeting (Body Moving, Mind Calm)", True

def generate_video_stream():
    cap = cv2.VideoCapture(0)
    eeg_idx = 0
    last_eeg_time = time.time()
    current_eeg_prob = 0.72

    while True:
        success, frame = cap.read()
        if not success:
            break

        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        detection_result = face_landmarker.detect(mp_image)

        now = time.time()
        if now - last_eeg_time >= 1.0:
            eeg_row = eeg_stream_df.iloc[[eeg_idx % len(eeg_stream_df)]][eeg_feature_cols]
            raw_eeg_prob = float(eeg_model.predict_proba(eeg_row)[0][1])
            at_ratio = float(eeg_row['alpha_theta_ratio'].values[0])
            calibrated_eeg = float(np.clip(raw_eeg_prob * 0.7 + (0.35 if at_ratio > 0.20 else 0.05), 0.05, 0.98))
            current_eeg_prob = round(0.6 * current_eeg_prob + 0.4 * calibrated_eeg, 3)

            telemetry_state["metrics"]["alpha_theta_ratio"] = round(at_ratio, 3)
            telemetry_state["metrics"]["beta_power"] = float(eeg_row['beta_power'].values[0])
            eeg_idx += 1
            last_eeg_time = now

        if detection_result.face_landmarks:
            landmarks = detection_result.face_landmarks[0]
            feat_dict, ear = extract_vision_features(landmarks)

            X_live = pd.DataFrame([feat_dict])[vision_model.feature_names_in_]
            rf_vis_prob = float(vision_model.predict_proba(X_live)[0][1])

            kinematic_stillness = float(np.exp(-35.0 * (feat_dict["gaze_stability"] + feat_dict["head_stability"])))
            vis_prob = float(np.clip(0.45 * rf_vis_prob + 0.55 * kinematic_stillness, 0.02, 0.99))

            fused_label, is_mismatch = evaluate_late_fusion(vis_prob, current_eeg_prob)
            draw_mesh_annotations(frame, landmarks, is_still=(vis_prob >= 0.50))

            telemetry_state["vision_score"] = round(vis_prob, 3)
            telemetry_state["eeg_score"] = round(current_eeg_prob, 3)
            telemetry_state["fused_state"] = fused_label
            telemetry_state["discrepancy_alert"] = is_mismatch
            telemetry_state["metrics"]["gaze_stability"] = round(feat_dict["gaze_stability"], 4)
            telemetry_state["metrics"]["head_stability"] = round(feat_dict["head_stability"], 4)
            telemetry_state["metrics"]["rolling_blinks"] = int(feat_dict["rolling_blinks"])
            telemetry_state["metrics"]["ear"] = round(ear, 3)

        ret, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.post("/analyze_image")
async def analyze_uploaded_image(file: UploadFile = File(...)):
    """Evaluates Ocular & Postural Focus from a single static uploaded image."""
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img_bgr is None:
        return JSONResponse(status_code=400, content={"error": "Invalid image file."})

    rgb_frame = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    detection_result = face_landmarker.detect(mp_image)

    if not detection_result.face_landmarks:
        return JSONResponse(status_code=422, content={"error": "No face detected in the uploaded image."})

    landmarks = detection_result.face_landmarks[0]
    raw_ear, raw_gx, raw_gy, raw_rx, raw_ry, raw_rz = compute_raw_geometry(landmarks)

    is_closed = raw_ear < 0.21
    au45_c = 1.0 if is_closed else 0.0
    au45_r = float(np.clip((0.28 - raw_ear) * 18.0, 0.0, 5.0))

    # For a single static snapshot, estimate deviation from centered optical axis
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

    X_static = pd.DataFrame([static_features])[vision_model.feature_names_in_]
    rf_prob = float(vision_model.predict_proba(X_static)[0][1])

    # Combine RF score with static alignment & eye openness penalty
    alignment_score = float(np.exp(-12.0 * (gaze_dev + head_dev)))
    if is_closed:
        alignment_score *= 0.35 # Penalize closed eyes / mid-blink in static photo

    final_vis_score = round(float(np.clip(0.45 * rf_prob + 0.55 * alignment_score, 0.02, 0.99)), 3)
    eeg_score = telemetry_state["eeg_score"]
    fused_label, is_mismatch = evaluate_late_fusion(final_vis_score, eeg_score)

    # Draw full eye, iris, and head mesh contours onto the uploaded photo
    draw_mesh_annotations(img_bgr, landmarks, is_still=(final_vis_score >= 0.50))

    _, buffer = cv2.imencode('.jpg', img_bgr)
    b64_img = base64.b64encode(buffer).decode('utf-8')

    return {
        "annotated_image": f"data:image/jpeg;base64,{b64_img}",
        "vision_score": final_vis_score,
        "eeg_score": eeg_score,
        "fused_state": fused_label,
        "discrepancy_alert": is_mismatch,
        "metrics": {
            "ear": round(raw_ear, 3),
            "gaze_angle_x": round(raw_gx, 4),
            "gaze_angle_y": round(raw_gy, 4),
            "pose_Rx": round(raw_rx, 4),
            "pose_Ry": round(raw_ry, 4),
            "pose_Rz": round(raw_rz, 4),
            "gaze_deviation": round(gaze_dev, 4),
            "head_deviation": round(head_dev, 4),
            "eye_status": "Closed / Blink (AU45)" if is_closed else "Open & Fixated"
        }
    }

@app.get("/")
def root():
    return {"status": "Focus Monitor API Online"}

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_video_stream(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/telemetry")
def get_telemetry():
    return telemetry_state

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)