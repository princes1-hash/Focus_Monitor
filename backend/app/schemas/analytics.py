from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.session import SessionSchema

class AnalyticsOverview(BaseModel):
    total_sessions: int = 0
    total_moments: int = 0
    total_active_duration_seconds: int = 0
    avg_vision_score: Optional[float] = None
    avg_eeg_score: Optional[float] = None
    discrepancy_ratio: Optional[float] = None
    latest_session: Optional[SessionSchema] = None

class AnalyticsSessionTrend(BaseModel):
    session_id: str
    started_at: str
    active_duration_seconds: int
    avg_vision_score: Optional[float] = None
    avg_eeg_score: Optional[float] = None
    avg_gaze_stability: Optional[float] = None
    avg_head_stability: Optional[float] = None
    avg_alpha_theta_ratio: Optional[float] = None
    avg_beta_power: Optional[float] = None
    discrepancy_ratio: Optional[float] = None
    moments_count: int = 0

class MomentsPerDay(BaseModel):
    date: str
    count: int

class AnalyticsTrends(BaseModel):
    sessions: List[AnalyticsSessionTrend] = Field(default_factory=list)
    moments_per_day: List[MomentsPerDay] = Field(default_factory=list)

