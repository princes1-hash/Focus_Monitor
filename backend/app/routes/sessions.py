import datetime
from typing import Optional, Dict, Any
from bson import ObjectId
from fastapi import APIRouter, Depends, Response, Query, status

from app.database import get_db
from app.config import settings
from app.utils.dependencies import get_current_user, parse_object_id
from app.utils.errors import APIError
from app.schemas.session import SessionSchema, SessionResponse, SessionListResponse
from app.routes.monitoring import format_session_doc, to_utc
from app.services.session_registry import session_registry

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

async def sweep_abandoned_sessions(db, user_id: ObjectId):
    now = datetime.datetime.now(datetime.timezone.utc)
    threshold = now - datetime.timedelta(seconds=settings.SESSION_IDLE_SECONDS)
    
    abandoned_cursor = db.monitoring_sessions.find({
        "user_id": user_id,
        "is_live": True,
        "last_heartbeat_at": {"$lt": threshold}
    })
    abandoned_list = await abandoned_cursor.to_list(length=100)
    for s in abandoned_list:
        sid_str = str(s["_id"])
        reg_state = session_registry.get(sid_str)
        if reg_state:
            summary, agg = reg_state.compute_summary_and_aggregates(now)
            dur, act_dur = reg_state.get_durations(now)
            session_registry.remove(sid_str)
        else:
            s_started = to_utc(s.get("started_at"))
            dur = int((now - s_started).total_seconds())
            act_dur = max(0, dur - int(s.get("paused_total_seconds", 0)))
            summary = s.get("summary")
            agg = s.get("aggregated_metrics")

        await db.monitoring_sessions.update_one(
            {"_id": s["_id"]},
            {"$set": {
                "status": "abandoned",
                "is_live": False,
                "ended_at": now,
                "duration_seconds": dur,
                "active_duration_seconds": act_dur,
                "summary": summary,
                "aggregated_metrics": agg,
                "updated_at": now
            }}
        )

@router.get("", response_model=SessionListResponse)
async def list_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime.datetime] = Query(None, alias="from"),
    date_to: Optional[datetime.datetime] = Query(None, alias="to"),
    sort: str = Query("newest"),
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    user_id = current_user["_id"]

    # Lazy sweep abandoned sessions
    await sweep_abandoned_sessions(db, user_id)

    query: Dict[str, Any] = {"user_id": user_id}
    if status:
        query["status"] = status

    if date_from or date_to:
        query["started_at"] = {}
        if date_from:
            query["started_at"]["$gte"] = date_from
        if date_to:
            query["started_at"]["$lte"] = date_to

    sort_order = -1 if sort == "newest" else 1

    total = await db.monitoring_sessions.count_documents(query)
    total_pages = max(1, (total + page_size - 1) // page_size)

    cursor = db.monitoring_sessions.find(query)\
        .sort("started_at", sort_order)\
        .skip((page - 1) * page_size)\
        .limit(page_size)

    docs = await cursor.to_list(length=page_size)
    items = [format_session_doc(d) for d in docs]

    return SessionListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages
    )

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    s_oid = parse_object_id(session_id)
    db = get_db()
    doc = await db.monitoring_sessions.find_one({"_id": s_oid, "user_id": current_user["_id"]})
    if not doc:
        raise APIError(status_code=404, code="not_found", message="Session not found.")

    return SessionResponse(session=format_session_doc(doc))

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    s_oid = parse_object_id(session_id)
    db = get_db()
    doc = await db.monitoring_sessions.find_one({"_id": s_oid, "user_id": current_user["_id"]})
    if not doc:
        raise APIError(status_code=404, code="not_found", message="Session not found.")

    if doc.get("is_live", False) or doc.get("status") in ["active", "paused"]:
        raise APIError(
            status_code=409,
            code="session_live",
            message="Cannot delete an active or paused session. Stop it first."
        )

    user_id = current_user["_id"]
    # Delete moments for this session
    await db.captured_moments.delete_many({"session_id": s_oid, "user_id": user_id})
    await db.monitoring_sessions.delete_one({"_id": s_oid})
    session_registry.remove(session_id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)

