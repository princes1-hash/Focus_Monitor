import datetime
import logging
from typing import Optional, Dict, Any, List
from bson import ObjectId
from app.database import get_db
from app.routes.monitoring import to_utc

logger = logging.getLogger(__name__)

async def get_analytics_overview(
    user_id: ObjectId,
    date_from: Optional[datetime.datetime] = None,
    date_to: Optional[datetime.datetime] = None
) -> Dict[str, Any]:
    db = get_db()
    if db is None:
        return {
            "total_sessions": 0,
            "total_moments": 0,
            "total_active_duration_seconds": 0,
            "avg_vision_score": None,
            "avg_eeg_score": None,
            "discrepancy_ratio": None,
            "latest_session": None
        }

    # Match completed or abandoned sessions owned by user
    match_query: Dict[str, Any] = {
        "user_id": user_id,
        "status": {"$in": ["completed", "abandoned"]},
        "aggregated_metrics": {"$ne": None}
    }
    if date_from or date_to:
        match_query["started_at"] = {}
        if date_from:
            match_query["started_at"]["$gte"] = date_from
        if date_to:
            match_query["started_at"]["$lte"] = date_to

    sessions_cursor = db.monitoring_sessions.find(match_query).sort("started_at", -1)
    sessions = await sessions_cursor.to_list(length=1000)

    # Moments count
    moment_match: Dict[str, Any] = {"user_id": user_id}
    if date_from or date_to:
        moment_match["timestamp"] = {}
        if date_from:
            moment_match["timestamp"]["$gte"] = date_from
        if date_to:
            moment_match["timestamp"]["$lte"] = date_to
    total_moments = await db.captured_moments.count_documents(moment_match)

    if not sessions:
        return {
            "total_sessions": 0,
            "total_moments": total_moments,
            "total_active_duration_seconds": 0,
            "avg_vision_score": None,
            "avg_eeg_score": None,
            "discrepancy_ratio": None,
            "latest_session": None
        }

    total_sessions = len(sessions)
    total_active_seconds = 0
    total_frames = 0
    weighted_vis_sum = 0.0
    weighted_eeg_sum = 0.0
    total_discrepancy_frames = 0

    for s in sessions:
        dur = s.get("active_duration_seconds") or 0
        total_active_seconds += dur
        agg = s.get("aggregated_metrics") or {}
        frames = agg.get("frames_analyzed") or 0

        vis_dist = agg.get("vision_score")
        if vis_dist and "mean" in vis_dist and vis_dist["mean"] is not None and frames > 0:
            weighted_vis_sum += vis_dist["mean"] * frames

        eeg_dist = agg.get("eeg_score")
        if eeg_dist and "mean" in eeg_dist and eeg_dist["mean"] is not None and frames > 0:
            weighted_eeg_sum += eeg_dist["mean"] * frames

        summary = s.get("summary") or {}
        disc_ratio = summary.get("discrepancy_ratio") or 0.0
        total_discrepancy_frames += disc_ratio * frames
        total_frames += frames

    avg_vision = round(weighted_vis_sum / total_frames, 3) if total_frames > 0 else None
    avg_eeg = round(weighted_eeg_sum / total_frames, 3) if total_frames > 0 else None
    avg_disc = round(total_discrepancy_frames / total_frames, 3) if total_frames > 0 else None

    # Latest session
    from app.routes.monitoring import format_session_doc
    latest_doc = format_session_doc(sessions[0]).model_dump()

    return {
        "total_sessions": total_sessions,
        "total_moments": total_moments,
        "total_active_duration_seconds": total_active_seconds,
        "avg_vision_score": avg_vision,
        "avg_eeg_score": avg_eeg,
        "discrepancy_ratio": avg_disc,
        "latest_session": latest_doc
    }

async def get_analytics_trends(
    user_id: ObjectId,
    date_from: Optional[datetime.datetime] = None,
    date_to: Optional[datetime.datetime] = None
) -> Dict[str, Any]:
    db = get_db()
    if db is None:
        return {"sessions": [], "moments_per_day": []}

    match_query: Dict[str, Any] = {
        "user_id": user_id,
        "status": {"$in": ["completed", "abandoned"]},
        "aggregated_metrics": {"$ne": None}
    }
    if date_from or date_to:
        match_query["started_at"] = {}
        if date_from:
            match_query["started_at"]["$gte"] = date_from
        if date_to:
            match_query["started_at"]["$lte"] = date_to

    sessions_cursor = db.monitoring_sessions.find(match_query).sort("started_at", 1)
    session_docs = await sessions_cursor.to_list(length=1000)

    trend_sessions = []
    for s in session_docs:
        agg = s.get("aggregated_metrics") or {}
        summary = s.get("summary") or {}
        vis_dist = agg.get("vision_score") or {}
        eeg_dist = agg.get("eeg_score") or {}

        started = s.get("started_at")
        started_str = to_utc(started).isoformat() if started else ""

        trend_sessions.append({
            "session_id": str(s["_id"]),
            "started_at": started_str,
            "active_duration_seconds": s.get("active_duration_seconds") or 0,
            "avg_vision_score": vis_dist.get("mean"),
            "avg_eeg_score": eeg_dist.get("mean"),
            "avg_gaze_stability": agg.get("gaze_stability_mean"),
            "avg_head_stability": agg.get("head_stability_mean"),
            "avg_alpha_theta_ratio": agg.get("alpha_theta_ratio_mean"),
            "avg_beta_power": agg.get("beta_power_mean"),
            "discrepancy_ratio": summary.get("discrepancy_ratio"),
            "moments_count": s.get("moments_count") or 0
        })

    # Moments per day aggregation
    pipeline = [
        {"$match": {"user_id": user_id}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    if date_from or date_to:
        date_match = {}
        if date_from:
            date_match["$gte"] = date_from
        if date_to:
            date_match["$lte"] = date_to
        pipeline[0]["$match"]["timestamp"] = date_match

    moments_per_day = []
    try:
        cursor = await db.captured_moments.aggregate(pipeline)
        moments_agg = await cursor.to_list(length=1000)
        moments_per_day = [{"date": m["_id"], "count": m["count"]} for m in moments_agg if m and m.get("_id")]
    except Exception as e:
        logger.warning(f"Aggregate failed, using safe fallback: {e}")
        try:
            m_cursor = db.captured_moments.find({"user_id": user_id})
            m_list = await m_cursor.to_list(length=1000)
            counts: Dict[str, int] = {}
            for item in m_list:
                ts = item.get("timestamp")
                if ts:
                    d_str = ts.strftime("%Y-%m-%d") if isinstance(ts, datetime.datetime) else str(ts)[:10]
                    counts[d_str] = counts.get(d_str, 0) + 1
            moments_per_day = [{"date": k, "count": v} for k, v in sorted(counts.items())]
        except Exception as inner_e:
            logger.error(f"Fallback moments count failed: {inner_e}")
            moments_per_day = []

    return {
        "sessions": trend_sessions,
        "moments_per_day": moments_per_day
    }

