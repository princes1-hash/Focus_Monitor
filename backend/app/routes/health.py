from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.database import get_db
from app.services.vision_service import VisionModelManager
from app.services.eeg_service import EEGModelManager

router = APIRouter(prefix="/api", tags=["health"])

@router.get("/health")
async def health_check():
    db = get_db()
    db_status = "ok"
    if db is not None:
        try:
            await db.command("ping")
        except Exception:
            db_status = "degraded"
    else:
        db_status = "degraded"

    models_loaded = False
    model_error = None
    try:
        vm = VisionModelManager.get_instance()
        em = EEGModelManager.get_instance()
        if vm.vision_model is not None and em.model is not None:
            models_loaded = True
    except Exception as e:
        models_loaded = False
        model_error = str(e)

    status = "ok" if (db_status == "ok" and models_loaded) else "degraded"
    status_code = 200

    return JSONResponse(
        status_code=status_code,
        content={
            "status": status,
            "db": db_status,
            "models_loaded": models_loaded,
            "model_error": model_error,
            "version": "1.0.0"
        }
    )

