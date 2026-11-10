from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CreateMomentRequest(BaseModel):
    session_id: str
    note: Optional[str] = Field(None, max_length=280)
    image_base64: Optional[str] = None

class MomentSchema(BaseModel):
    id: str
    session_id: str
    timestamp: str
    fused_state: str
    fused_code: str
    vision_score: Optional[float] = None
    eeg_score: Optional[float] = None
    discrepancy_alert: bool = False
    eeg_source: str = "simulated_csv"
    metrics: Dict[str, Any] = Field(default_factory=dict)
    note: Optional[str] = None
    has_image: bool = False
    image_url: Optional[str] = None
    created_at: str

class MomentResponse(BaseModel):
    moment: MomentSchema

class MomentListResponse(BaseModel):
    items: List[MomentSchema]
    page: int
    page_size: int
    total: int
    total_pages: int

