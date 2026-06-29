"""Điểm vào ứng dụng FastAPI — mount router, middleware, exception handler.

Trang API docs tự sinh tại /docs (Swagger) và /redoc.
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import app.database  # noqa: F401 — đăng ký toàn bộ model
from app.core.config import settings
from app.core.database import Base, engine
from app.core.exceptions import register_exception_handlers
from app.middleware.logging import LogActivityMiddleware, MaintenanceMiddleware


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Tạo bảng nếu chưa có (dev). Production dùng Alembic migration.
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    # Dev: thêm cột mới còn thiếu vào bảng cũ (create_all không ALTER).
    if settings.app_env not in {"prod", "production"}:
        from app.core.dev_migrate import ensure_columns

        ensure_columns(engine, "suppliers", {"config": "JSON"})
        ensure_columns(
            engine,
            "products",
            {
                "quantity": "INTEGER DEFAULT 0",
                "low_stock_threshold": "INTEGER DEFAULT 0",
                "warranty_days": "INTEGER DEFAULT 0",
                "name_en": "VARCHAR(255)",
                "category_name": "VARCHAR(255)",
                "regular_price": "NUMERIC(18, 2)",
                "provider_discount_percent": "NUMERIC(7, 2)",
                "delivery_type": "VARCHAR(30)",
                "provider_quantity": "INTEGER",
            },
        )
        ensure_columns(
            engine,
            "stock_movements",
            {
                "tracks_stock": "BOOLEAN DEFAULT 1",
                "unit_cost": "NUMERIC(18, 2)",
                "unit_price": "NUMERIC(18, 2)",
                "cash_in": "NUMERIC(18, 2) DEFAULT 0",
                "cash_out": "NUMERIC(18, 2) DEFAULT 0",
            },
        )
        ensure_columns(
            engine,
            "orders",
            {
                "supplier_id": "INTEGER",
                "supplier_payable": "NUMERIC(18, 2) DEFAULT 0",
                "owner_user_id": "INTEGER",
                "owner_profit": "NUMERIC(18, 2) DEFAULT 0",
                "fulfillment_type": "VARCHAR(30)",
                "manual_fulfillment_required": "BOOLEAN DEFAULT 0",
                "manual_contact_name": "VARCHAR(255)",
                "manual_contact_url": "TEXT",
                "manual_qr_image_url": "TEXT",
            },
        )
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="API hệ thống bán sản phẩm số + đại lý/CTV (Order Nexora).",
        lifespan=lifespan,
    )

    # CORS cho frontend React.
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
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

    from app.api import register_routers

    register_routers(app)

    # Serve file tĩnh đã upload (ảnh QR, ...).
    upload_dir = Path("storage/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

    _mount_frontend(app)
    return app


def _mount_frontend(app: FastAPI) -> None:
    """Phục vụ frontend React đã build (dist/) ngay trong FastAPI.

    Nhờ đó toàn bộ hệ thống chạy trên 1 cổng / 1 origin — không cần CORS,
    Cloudflare Tunnel chỉ cần trỏ vào cổng này. Các route /api và /uploads
    đã đăng ký ở trên nên được ưu tiên; mọi đường dẫn còn lại trả về
    index.html để React Router xử lý (SPA fallback).
    """
    if settings.frontend_dist_dir:
        dist = Path(settings.frontend_dist_dir)
    else:
        # backend/app/main.py -> backend/app -> backend -> repo -> frontend/dist
        dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"

    index_file = dist / "index.html"
    if not index_file.exists():
        return  # Chưa build frontend — bỏ qua, chỉ chạy API.

    # File tĩnh có thật (JS/CSS/ảnh) — phục vụ trực tiếp.
    app.mount("/assets", StaticFiles(directory=str(dist / "assets")), name="assets")

    def _index_response() -> FileResponse:
        return FileResponse(
            str(index_file),
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):  # noqa: ANN202
        candidate = dist / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        return _index_response()


app = create_app()
