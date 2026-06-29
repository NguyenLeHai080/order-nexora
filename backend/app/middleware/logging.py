"""Middleware: chặn khi bảo trì + ghi nhật ký hoạt động cho mỗi request."""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

# Các đường dẫn luôn cho qua kể cả khi bảo trì.
_MAINTENANCE_ALLOWLIST = ("/api/auth/login", "/docs", "/redoc", "/openapi.json", "/api/health")


class MaintenanceMiddleware(BaseHTTPMiddleware):
    """Khi bật bảo trì, chặn mọi API mua bán; chỉ admin/login đi qua.

    Trạng thái đọc từ bảng settings (key = maintenance_mode). Để tránh phụ thuộc
    vòng, đọc lazy qua hàm getter truyền vào.
    """

    def __init__(self, app, is_maintenance):  # noqa: ANN001
        super().__init__(app)
        self._is_maintenance = is_maintenance

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if self._is_maintenance() and not path.startswith(_MAINTENANCE_ALLOWLIST):
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "message": "Hệ thống đang bảo trì. Vui lòng quay lại sau.",
                    "data": None,
                },
            )
        return await call_next(request)


class LogActivityMiddleware(BaseHTTPMiddleware):
    """Ghi nhật ký mỗi request (method, route, status, ip, user-agent)."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        try:
            self._write_log(request, response.status_code)
        except Exception:  # noqa: BLE001 — log lỗi không được làm hỏng request
            pass
        return response

    def _write_log(self, request: Request, status_code: int) -> None:
        # Chỉ log các route API có thay đổi dữ liệu hoặc lỗi, tránh log GET tài nguyên tĩnh.
        path = request.url.path
        if not path.startswith("/api") or path.endswith(("/openapi.json",)):
            return

        from app.core.database import SessionLocal
        from app.modules.log_activities.models import LogActivity

        db = SessionLocal()
        try:
            log = LogActivity(
                description=f"{request.method} {path}",
                user_type="User",
                route=str(request.url),
                method_type=request.method,
                status_code=status_code,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )
            db.add(log)
            db.commit()
        finally:
            db.close()
