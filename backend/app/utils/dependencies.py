from typing import Optional, Dict, Any
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Request, Depends
from app.database import get_db
from app.utils.security import decode_access_token
from app.utils.errors import APIError

def parse_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError, ValueError):
        raise APIError(status_code=404, code="not_found", message="Resource not found")

async def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None
    if payload.get("error") == "token_expired":
        raise APIError(status_code=401, code="token_expired", message="Session expired. Please log in again.")

    user_id_str = payload.get("sub")
    if not user_id_str:
        return None

    try:
        user_oid = ObjectId(user_id_str)
    except InvalidId:
        return None

    db = get_db()
    if db is None:
        raise APIError(status_code=503, code="db_unavailable", message="Database connection unavailable")

    user = await db.users.find_one({"_id": user_oid})
    if not user:
        return None

    user["id"] = str(user["_id"])
    return user

async def get_current_user(request: Request) -> Dict[str, Any]:
    user = await get_current_user_optional(request)
    if not user:
        raise APIError(status_code=401, code="not_authenticated", message="Authentication required")
    return user

