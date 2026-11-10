import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import connect_to_db, close_db_connection
from app.services.vision_service import VisionModelManager
from app.services.eeg_service import EEGModelManager
from app.utils.errors import (
    APIError,
    api_error_handler,
    validation_exception_handler,
    generic_exception_handler
)
from app.routes import (
    health,
    auth,
    users,
    monitoring,
    moments,
    sessions,
    analytics
)

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Focus Monitor API backend...")
    # 1. Connect to Database & Create Indexes
    await connect_to_db()

    # 2. Pre-load ML models
    try:
        vm = VisionModelManager.get_instance()
        em = EEGModelManager.get_instance()
        logger.info("All ML models and assets successfully loaded.")
    except Exception as e:
        logger.error(f"Error loading ML models: {e}")
        if settings.ENVIRONMENT == "production":
            raise e

    yield

    logger.info("Shutting down Focus Monitor API backend...")
    await close_db_connection()

app = FastAPI(
    title="AI-Driven Ocular & Cognitive Focus Monitoring Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Idempotency-Key", "Retry-After"]
)

# Custom Exception Handlers
app.add_exception_handler(APIError, api_error_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
# We can allow generic_exception_handler in prod or debug
if settings.ENVIRONMENT == "production":
    app.add_exception_handler(Exception, generic_exception_handler)

# Register Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(monitoring.router)
app.include_router(moments.router)
app.include_router(sessions.router)
app.include_router(analytics.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

