import os
import platform
import subprocess
import ctypes
import logging
import asyncio
from contextlib import asynccontextmanager

# Linux Headless OpenGL / GLES Shared Object Stub for Cloud Environments (e.g. Render)
def ensure_linux_gl_stubs():
    if platform.system() != "Linux":
        return
    for lib_name in ["libGLESv2.so.2", "libEGL.so.1", "libGL.so.1"]:
        try:
            ctypes.CDLL(lib_name)
        except OSError:
            libs_dir = os.path.join(os.path.dirname(__file__), ".libs")
            os.makedirs(libs_dir, exist_ok=True)
            so_file = os.path.join(libs_dir, lib_name)
            c_file = os.path.join(libs_dir, "dummy_gl.c")
            if not os.path.exists(so_file):
                with open(c_file, "w") as f:
                    f.write(
                        "void* glGetString(unsigned int name) { return 0; }\n"
                        "void glBindBuffer(unsigned int target, unsigned int buffer) {}\n"
                        "unsigned int glCreateProgram(void) { return 1; }\n"
                        "void glUseProgram(unsigned int program) {}\n"
                        "void* eglGetDisplay(void* display_id) { return 0; }\n"
                        "int eglInitialize(void* dpy, int* major, int* minor) { return 1; }\n"
                        "int eglTerminate(void* dpy) { return 1; }\n"
                    )
                try:
                    subprocess.run(["gcc", "-shared", "-fPIC", "-o", so_file, c_file], check=False)
                except Exception:
                    pass
            if os.path.exists(so_file):
                try:
                    ctypes.CDLL(so_file, mode=ctypes.RTLD_GLOBAL)
                except Exception:
                    pass

ensure_linux_gl_stubs()

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

    # 2. Asynchronously warm up ML models in worker thread without blocking port binding
    async def warm_up_models():
        try:
            logger.info("Warming up ML models and MediaPipe assets...")
            await asyncio.to_thread(VisionModelManager.get_instance)
            await asyncio.to_thread(EEGModelManager.get_instance)
            logger.info("All ML models and assets successfully loaded and ready.")
        except Exception as e:
            logger.error(f"Error loading ML models: {e}", exc_info=True)

    asyncio.create_task(warm_up_models())

    # Yield immediately so Uvicorn opens the listening port without triggering Render timeout
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

