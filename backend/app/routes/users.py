import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, Response, status
from app.database import get_db
from app.schemas.auth import AuthResponse
from app.schemas.user import UpdateProfileRequest, ChangePasswordRequest, DeleteAccountRequest
from app.utils.dependencies import get_current_user
from app.utils.security import verify_password, hash_password
from app.utils.errors import APIError
from app.routes.auth import format_user_doc, clear_auth_cookie
from app.services.session_registry import session_registry

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/profile", response_model=AuthResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return AuthResponse(user=format_user_doc(current_user))

@router.put("/profile", response_model=AuthResponse)
async def update_profile(payload: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user["_id"]
    update_fields = {"updated_at": datetime.datetime.now(datetime.timezone.utc)}

    if payload.name is not None:
        update_fields["name"] = payload.name
    if payload.preferences is not None:
        update_fields["preferences"] = payload.preferences.model_dump()

    await db.users.update_one({"_id": user_id}, {"$set": update_fields})
    updated_user = await db.users.find_one({"_id": user_id})
    return AuthResponse(user=format_user_doc(updated_user))

@router.put("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(payload: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if not verify_password(payload.current_password, current_user.get("password_hash", "")):
        raise APIError(status_code=401, code="invalid_credentials", message="Current password is incorrect.")

    db = get_db()
    new_hashed = hash_password(payload.new_password)
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "password_hash": new_hashed,
            "updated_at": datetime.datetime.now(datetime.timezone.utc)
        }}
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(payload: DeleteAccountRequest, response: Response, current_user: dict = Depends(get_current_user)):
    if not verify_password(payload.password, current_user.get("password_hash", "")):
        raise APIError(status_code=401, code="invalid_credentials", message="Password is incorrect.")

    db = get_db()
    user_id = current_user["_id"]

    # Delete all moments, sessions, and user
    await db.captured_moments.delete_many({"user_id": user_id})
    await db.monitoring_sessions.delete_many({"user_id": user_id})
    await db.users.delete_one({"_id": user_id})

    # Clear in-memory session registry for this user
    session_registry.remove_for_user(str(user_id))
    clear_auth_cookie(response)

    return Response(status_code=status.HTTP_204_NO_CONTENT)

