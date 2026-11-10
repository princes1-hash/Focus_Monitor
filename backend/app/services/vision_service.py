import os
import math
import base64
import threading
from collections import deque
from typing import Dict, Any, Tuple, Optional, List
import cv2
import joblib
import numpy as np
import pandas as pd
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

# Constants for mesh & contours
LEFT_EYE_CONTOUR = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
RIGHT_EYE_CONTOUR = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
LEFT_IRIS_RING = [469, 470, 471, 472]
RIGHT_IRIS_RING = [474, 475, 476, 477]
FACE_OVAL_CONTOUR = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
]
LEFT_EYEBROW_CONTOUR = [70, 63, 105, 66, 107]
RIGHT_EYEBROW_CONTOUR = [336, 296, 334, 293, 300]
LIPS_CONTOUR = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]
KEY_MESH_INDICES = [
    10, 67, 109, 297, 338, 9, 8,
    116, 123, 147, 213, 234, 345, 352, 376, 433, 454,
    168, 6, 197, 195, 5, 4, 1, 19, 94, 2,
    152, 148, 176, 149, 150, 136, 172, 377, 400, 378, 379, 365, 397
]

class VisionModelManager:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(__file__))

        def find_candidate(filename: str) -> str:
            candidates = [
                os.path.join(base_dir, "ml", filename),
                os.path.join(base_dir, "..", "ml", filename),
                os.path.join(base_dir, "..", filename),
                os.path.join(os.getcwd(), "backend", "app", "ml", filename),
                os.path.join(os.getcwd(), filename),
                filename
            ]
            for p in candidates:
                if os.path.exists(p):
                    return os.path.abspath(p)
            return candidates[0]

        model_path = find_candidate("vision_model.joblib")
        task_path = find_candidate("face_landmarker.task")

        if not os.path.exists(task_path):
            try:
                import urllib.request
                url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
                os.makedirs(os.path.dirname(task_path), exist_ok=True)
                urllib.request.urlretrieve(url, task_path)
            except Exception:
                pass

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Vision model file not found at {model_path}")
        if not os.path.exists(task_path):
            raise FileNotFoundError(f"Face landmarker task not found at {task_path}")

        self.vision_model = joblib.load(model_path)

        base_options = mp_python.BaseOptions(model_asset_path=task_path)
        options = mp_vision.FaceLandmarkerOptions(
            base_options=base_options,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.landmarker = mp_vision.FaceLandmarker.create_from_options(options)
        self.landmarker_lock = threading.Lock()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = VisionModelManager()
        return cls._instance

    def detect_landmarks(self, mp_image):
        with self.landmarker_lock:
            return self.landmarker.detect(mp_image)

def calculate_ear(landmarks, indices) -> float:
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

def compute_raw_geometry(landmarks) -> Tuple[float, float, float, float, float, float]:
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

class VisionFeatureExtractor:
    """Per-session vision feature extraction with EMA smoothing and rolling windows."""
    def __init__(self, gaze_window: int = 30, blink_window: int = 90):
        self.gaze_x_buf = deque(maxlen=gaze_window)
        self.gaze_y_buf = deque(maxlen=gaze_window)
        self.pose_rx_buf = deque(maxlen=gaze_window)
        self.pose_ry_buf = deque(maxlen=gaze_window)
        self.blink_buf = deque(maxlen=blink_window)

        self.ema_state = {
            "gx": None, "gy": None, "rx": None, "ry": None, "rz": None, "ear": 0.30
        }
        self.ema_alpha = 0.25
        self.was_eye_closed = False
        self.total_blink_events = 0

    def smooth_val(self, key: str, new_val: float) -> float:
        if self.ema_state[key] is None:
            self.ema_state[key] = new_val
        else:
            self.ema_state[key] = self.ema_alpha * new_val + (1.0 - self.ema_alpha) * self.ema_state[key]
        return self.ema_state[key]

    def extract_features(self, landmarks) -> Tuple[Dict[str, float], float, bool]:
        raw_ear, raw_gx, raw_gy, raw_rx, raw_ry, raw_rz = compute_raw_geometry(landmarks)

        ear = self.smooth_val("ear", raw_ear)
        is_closed = raw_ear < 0.22
        blink_event = 1.0 if (is_closed and not self.was_eye_closed) else 0.0
        if blink_event == 1.0:
            self.total_blink_events += 1
        self.was_eye_closed = is_closed

        au45_c = 1.0 if is_closed else 0.0
        au45_r = float(np.clip((0.28 - raw_ear) * 18.0, 0.0, 5.0))

        gaze_angle_x = float(self.smooth_val("gx", raw_gx))
        gaze_angle_y = float(self.smooth_val("gy", raw_gy))
        pose_Rx = float(self.smooth_val("rx", raw_rx))
        pose_Ry = float(self.smooth_val("ry", raw_ry))
        pose_Rz = float(self.smooth_val("rz", raw_rz))

        self.gaze_x_buf.append(gaze_angle_x)
        self.gaze_y_buf.append(gaze_angle_y)
        self.pose_rx_buf.append(pose_Rx)
        self.pose_ry_buf.append(pose_Ry)
        self.blink_buf.append(blink_event)

        gaze_stability = float(np.std(self.gaze_x_buf) + np.std(self.gaze_y_buf)) if len(self.gaze_x_buf) > 4 else 0.0
        head_stability = float(np.std(self.pose_rx_buf) + np.std(self.pose_ry_buf)) if len(self.pose_rx_buf) > 4 else 0.0
        rolling_blinks = float(np.sum(self.blink_buf))

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
        return feature_dict, ear, is_closed

    def score(self, feature_dict: Dict[str, float]) -> Tuple[float, float, float]:
        manager = VisionModelManager.get_instance()
        X_live = pd.DataFrame([feature_dict])[manager.vision_model.feature_names_in_]
        rf_vis_prob = float(manager.vision_model.predict_proba(X_live)[0][1])

        kinematic_stillness = float(np.exp(-35.0 * (feature_dict["gaze_stability"] + feature_dict["head_stability"])))
        vis_prob = float(np.clip(0.45 * rf_vis_prob + 0.55 * kinematic_stillness, 0.02, 0.99))
        return vis_prob, rf_vis_prob, kinematic_stillness

def build_overlay(landmarks) -> Dict[str, Any]:
    """Generates normalized coordinate polylines for the client canvas."""
    def coords(indices):
        return [[round(landmarks[i].x, 4), round(landmarks[i].y, 4)] for i in indices if i < len(landmarks)]

    iris_centers = []
    if len(landmarks) > 473:
        iris_centers = [
            [round(landmarks[468].x, 4), round(landmarks[468].y, 4)],
            [round(landmarks[473].x, 4), round(landmarks[473].y, 4)]
        ]

    overlay = {
        "face_oval": coords(FACE_OVAL_CONTOUR),
        "left_eye": coords(LEFT_EYE_CONTOUR),
        "right_eye": coords(RIGHT_EYE_CONTOUR),
        "left_iris": coords(LEFT_IRIS_RING) if len(landmarks) > 472 else [],
        "right_iris": coords(RIGHT_IRIS_RING) if len(landmarks) > 477 else [],
        "nose": coords([168, 6, 197, 195, 5, 4, 1]),
        "left_eyebrow": coords(LEFT_EYEBROW_CONTOUR),
        "right_eyebrow": coords(RIGHT_EYEBROW_CONTOUR),
        "lips": coords(LIPS_CONTOUR),
        "iris_centers": iris_centers,
        "mesh_points": coords(KEY_MESH_INDICES)
    }
    return overlay

def draw_mesh_annotations(frame, landmarks, is_still: bool):
    """Draws mesh contours directly onto a frame for static-image analysis."""
    h, w, _ = frame.shape

    def to_px(idx_list):
        return np.array([[int(landmarks[i].x * w), int(landmarks[i].y * h)] for i in idx_list if i < len(landmarks)], np.int32)

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

