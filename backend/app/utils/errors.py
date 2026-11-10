from typing import Optional, Any
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

class APIError(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Any] = None,
        headers: Optional[dict] = None
    ):
        super().__init__(status_code=status_code, detail=message, headers=headers)
        self.code = code
        self.message = message
        self.details = details

async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    content = {
        "error": {
            "code": exc.code,
            "message": exc.message,
            "details": exc.details
        }
    }
    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers=exc.headers
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    formatted_details = []
    for error in exc.errors():
        field = ".".join([str(loc) for loc in error.get("loc", []) if loc != "body"])
        formatted_details.append({
            "field": field,
            "message": error.get("msg", "Invalid value")
        })
    content = {
        "error": {
            "code": "validation_error",
            "message": "Validation failed for request parameters or payload.",
            "details": formatted_details
        }
    }
    return JSONResponse(status_code=422, content=content)

async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    content = {
        "error": {
            "code": "server_error",
            "message": "An unexpected error occurred.",
            "details": None
        }
    }
    return JSONResponse(status_code=500, content=content)

