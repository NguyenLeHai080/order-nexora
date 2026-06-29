"""Exception nghiệp vụ + handler trả về đúng envelope {success, message}."""
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppException(Exception):
    """Lỗi nghiệp vụ chung — controller/service raise ra."""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppException):
    def __init__(self, message: str = "Không tìm thấy dữ liệu."):
        super().__init__(message, status.HTTP_404_NOT_FOUND)


class ForbiddenError(AppException):
    def __init__(self, message: str = "Bạn không có quyền thực hiện hành động này."):
        super().__init__(message, status.HTTP_403_FORBIDDEN)


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Chưa xác thực."):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)


def register_exception_handlers(app) -> None:  # noqa: ANN001
    """Đăng ký handler để mọi lỗi trả về cùng format envelope."""

    @app.exception_handler(AppException)
    async def _app_exc(_request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "message": exc.message, "data": None},
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_exc(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "message": str(exc.detail), "data": None},
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_exc(_request: Request, exc: RequestValidationError) -> JSONResponse:
        # Pydantic v2 nhét object gốc (vd ValueError từ validator) vào ctx ->
        # không JSON-serializable. Ép str để envelope luôn trả được.
        errors = exc.errors()
        for err in errors:
            ctx = err.get("ctx")
            if isinstance(ctx, dict):
                err["ctx"] = {k: str(v) for k, v in ctx.items()}
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "message": "Dữ liệu không hợp lệ.",
                "errors": errors,
                "data": None,
            },
        )
