import datetime
from fastapi import APIRouter, Response, Request, Depends, status
from app.database import get_db
from app.config import settings
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, UserSchema
from app.utils.security import hash_password, verify_password, create_access_token
from app.utils.errors import APIError
from app.utils.dependencies import get_current_user
from app.utils.rate_limit import login_rate_limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

def clear_auth_cookie(response: Response):
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE
    )

def format_user_doc(doc: dict) -> UserSchema:
    return UserSchema(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        preferences=doc.get("preferences", {"store_frames": False}),
        created_at=doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime.datetime) else str(doc["created_at"]),
        updated_at=doc["updated_at"].isoformat() if isinstance(doc["updated_at"], datetime.datetime) else str(doc["updated_at"])
    )

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, response: Response):
    db = get_db()
    if db is None:
        raise APIError(status_code=503, code="db_unavailable", message="Database connection unavailable")

    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise APIError(
            status_code=409,
            code="email_taken",
            message="An account with this email address already exists."
        )

    now = datetime.datetime.now(datetime.timezone.utc)
    hashed = hash_password(payload.password)

    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hashed,
        "preferences": {"store_frames": False},
        "created_at": now,
        "updated_at": now
    }

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_access_token(str(result.inserted_id), payload.email)
    set_auth_cookie(response, token)

    return AuthResponse(user=format_user_doc(user_doc))

@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, request: Request, response: Response):
    client_ip = request.client.host if request.client else "unknown"
    login_rate_limiter.check(f"login_{client_ip}")

    db = get_db()
    if db is None:
        raise APIError(status_code=503, code="db_unavailable", message="Database connection unavailable")

    user = await db.users.find_one({"email": payload.email})
    if not user:
        raise APIError(
            status_code=401,
            code="invalid_credentials",
            message="Invalid email or password."
        )

    if not verify_password(payload.password, user.get("password_hash", "")):
        raise APIError(
            status_code=401,
            code="invalid_credentials",
            message="Invalid email or password."
        )

    token = create_access_token(str(user["_id"]), user["email"])
    set_auth_cookie(response, token)

    return AuthResponse(user=format_user_doc(user))

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    clear_auth_cookie(response)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/me", response_model=AuthResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return AuthResponse(user=format_user_doc(current_user))
