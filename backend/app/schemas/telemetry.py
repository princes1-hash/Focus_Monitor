from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class TelemetryMetrics(BaseModel):
    gaze_stability: Optional[float] = None
    head_stability: Optional[float] = None
    rolling_blinks: Optional[int] = None
    ear: Optional[float] = None
    alpha_theta_ratio: Optional[float] = None
    beta_power: Optional[float] = None

class TelemetryComponents(BaseModel):
    vision_rf_prob: Optional[float] = None
    vision_kinematic_stillness: Optional[float] = None
    eeg_rf_prob_raw: Optional[float] = None
    eeg_calibrated_prob: Optional[float] = None

class Telemetry(BaseModel):
    timestamp: str
    vision_score: Optional[float] = None
    eeg_score: Optional[float] = None
    fused_state: Optional[str] = None
    fused_code: Optional[str] = None
    discrepancy_alert: bool = False
    eeg_source: str = "simulated_csv"
    metrics: TelemetryMetrics
    components: TelemetryComponents

class Overlay(BaseModel):
    face_oval: List[List[float]] = Field(default_factory=list)
    left_eye: List[List[float]] = Field(default_factory=list)
    right_eye: List[List[float]] = Field(default_factory=list)
    left_iris: List[List[float]] = Field(default_factory=list)
    right_iris: List[List[float]] = Field(default_factory=list)
    nose: List[List[float]] = Field(default_factory=list)
    left_eyebrow: List[List[float]] = Field(default_factory=list)
    right_eyebrow: List[List[float]] = Field(default_factory=list)
    lips: List[List[float]] = Field(default_factory=list)
    iris_centers: List[List[float]] = Field(default_factory=list)
    mesh_points: List[List[float]] = Field(default_factory=list)

class FrameResponse(BaseModel):
    session_id: str
    face_detected: bool
    telemetry: Optional[Telemetry] = None
    overlay: Optional[Overlay] = None

class TelemetryResponse(BaseModel):
    session_id: str
    status: str
    telemetry: Optional[Telemetry] = None

class AnalyzeImageMetrics(BaseModel):
    ear: float
    gaze_angle_x: float
    gaze_angle_y: float
    pose_Rx: float
    pose_Ry: float
    pose_Rz: float
    gaze_deviation: float
    head_deviation: float
    eye_status: str

class AnalyzeImageResponse(BaseModel):
    annotated_image: str
    vision_score: float
    eeg_score: Optional[float] = None
    eeg_source: Optional[str] = None
    fused_state: Optional[str] = None
    fused_code: Optional[str] = None
    discrepancy_alert: bool = False
    metrics: AnalyzeImageMetrics
    method_note: str = "Single-frame heuristic estimate; rolling-window features are approximated."

