from typing import Optional, List, Dict, Literal
from pydantic import BaseModel, Field

class ScoreDistribution(BaseModel):
    mean: float
    min: float
    max: float

class FusedCodeDistribution(BaseModel):
    both_high: float = 0.0
    both_low: float = 0.0
    vision_high_eeg_low: float = 0.0
    vision_low_eeg_high: float = 0.0

class SessionSummary(BaseModel):
    dominant_fused_code: Optional[str] = None
    dominant_fused_state: Optional[str] = None
    discrepancy_ratio: Optional[float] = None

class AggregatedMetrics(BaseModel):
    frames_analyzed: int = 0
    frames_without_face: int = 0
    vision_score: Optional[ScoreDistribution] = None
    eeg_score: Optional[ScoreDistribution] = None
    gaze_stability_mean: Optional[float] = None
    head_stability_mean: Optional[float] = None
    blinks_per_minute_mean: Optional[float] = None
    alpha_theta_ratio_mean: Optional[float] = None
    beta_power_mean: Optional[float] = None
    fused_code_distribution: Optional[FusedCodeDistribution] = None

class SessionSchema(BaseModel):
    id: str
    status: str
    source: str = "browser_camera"
    eeg_source: str = "simulated_csv"
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: Optional[int] = None
    active_duration_seconds: Optional[int] = None
    moments_count: int = 0
    summary: Optional[SessionSummary] = None
    aggregated_metrics: Optional[AggregatedMetrics] = None
    created_at: str

class StartMonitoringRequest(BaseModel):
    source: Literal["browser_camera"] = "browser_camera"
    eeg_source: Literal["simulated_csv"] = "simulated_csv"

class StartMonitoringLimits(BaseModel):
    max_fps: int = 10
    max_frame_bytes: int = 512000
    recommended_frame_width: int = 320

class StartMonitoringResponse(BaseModel):
    session: SessionSchema
    limits: StartMonitoringLimits = Field(default_factory=StartMonitoringLimits)

class SessionResponse(BaseModel):
    session: SessionSchema

class SessionActionRequest(BaseModel):
    session_id: str

class SessionListResponse(BaseModel):
    items: List[SessionSchema]
    page: int
    page_size: int
    total: int
    total_pages: int

