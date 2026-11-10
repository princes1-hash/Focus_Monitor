import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.utils.dependencies import get_current_user
from app.schemas.analytics import AnalyticsOverview, AnalyticsTrends
from app.services.analytics_service import get_analytics_overview, get_analytics_trends

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    date_from: Optional[datetime.datetime] = Query(None, alias="from"),
    date_to: Optional[datetime.datetime] = Query(None, alias="to"),
    current_user: dict = Depends(get_current_user)
):
    data = await get_analytics_overview(current_user["_id"], date_from, date_to)
    return AnalyticsOverview(**data)

@router.get("/trends", response_model=AnalyticsTrends)
async def analytics_trends(
    date_from: Optional[datetime.datetime] = Query(None, alias="from"),
    date_to: Optional[datetime.datetime] = Query(None, alias="to"),
    current_user: dict = Depends(get_current_user)
):
    data = await get_analytics_trends(current_user["_id"], date_from, date_to)
    return AnalyticsTrends(**data)

