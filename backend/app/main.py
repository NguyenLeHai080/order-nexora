"""Điểm vào ứng dụng FastAPI — mount router, middleware, exception handler.

Trang API docs tự sinh tại /docs (Swagger) và /redoc.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.database  # noqa: F401 — đăng ký toàn bộ model
from app.core.config import settings
from app.core.database import Base, engine
from app.core.exceptions import register_exception_handlers
from app.middleware.logging import LogActivityMiddleware, MaintenanceMiddleware


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Tạo bảng nếu chưa có (dev). Production dùng Alembic migration.
    Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="API hệ thống bán sản phẩm số + đại lý/CTV (Order Nexora).",
        lifespan=lifespan,
    )

    # CORS cho frontend React.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware nghiệp vụ.
    from app.modules.settings.service import is_maintenance

    app.add_middleware(LogActivityMiddleware)
    app.add_middleware(MaintenanceMiddleware, is_maintenance=is_maintenance)

    register_exception_handlers(app)
    _mount_routers(app)
    return app


def _mount_routers(app: FastAPI) -> None:
    prefix = settings.api_prefix

    from app.modules.auth.router import router as auth_router
    from app.modules.auth.router import user_router
    from app.modules.log_activities.router import router as log_router
    from app.modules.orders.router import router as orders_router
    from app.modules.organizations.router import router as org_router
    from app.modules.payments.router import router as payments_router
    from app.modules.products.router import router as products_router
    from app.modules.settings.router import router as settings_router
    from app.modules.suppliers.router import router as suppliers_router
    from app.modules.users.router import router as users_router
    from app.modules.vouchers.router import router as vouchers_router

    @app.get(f"{prefix}/health", tags=["Health"], summary="Health check")
    def health() -> dict:
        return {"success": True, "message": "ok", "data": {"service": "order-nexora"}}

    app.include_router(auth_router, prefix=prefix)
    app.include_router(user_router, prefix=prefix)
    app.include_router(org_router, prefix=prefix)
    app.include_router(users_router, prefix=prefix)
    app.include_router(log_router, prefix=prefix)
    app.include_router(settings_router, prefix=prefix)
    app.include_router(suppliers_router, prefix=prefix)
    app.include_router(products_router, prefix=prefix)
    app.include_router(payments_router, prefix=prefix)
    app.include_router(orders_router, prefix=prefix)
    app.include_router(vouchers_router, prefix=prefix)


app = create_app()
