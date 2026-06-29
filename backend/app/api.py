"""Tập hợp & đăng ký toàn bộ router của ứng dụng.

Tách khỏi main.py để main.py chỉ lo việc khởi tạo app (middleware, static,
exception handler). Khi thêm module mới, chỉ cần import router của nó và
thêm vào danh sách `MODULE_ROUTERS` bên dưới — xem docs/backend-guide.md.
"""
from fastapi import APIRouter, FastAPI

from app.core.config import settings

# Health check tách riêng (không thuộc module nghiệp vụ nào).
health_router = APIRouter(tags=["Health"])


@health_router.get("/health", summary="Health check")
def health() -> dict:
    return {"success": True, "message": "ok", "data": {"service": "order-nexora"}}


def _collect_routers() -> list[APIRouter]:
    """Import & trả về danh sách router theo đúng thứ tự đăng ký.

    Import bên trong hàm để tránh import vòng (circular import) khi
    các module tham chiếu lẫn nhau lúc khởi động.
    """
    from app.modules.auth.router import router as auth_router
    from app.modules.auth.router import user_router
    from app.modules.inventory.router import router as inventory_router
    from app.modules.invoices.router import router as invoices_router
    from app.modules.log_activities.router import router as log_router
    from app.modules.orders.router import router as orders_router
    from app.modules.organizations.router import router as org_router
    from app.modules.partner.router import router as partner_router
    from app.modules.payments.router import router as payments_router
    from app.modules.permissions.router import permissions_router
    from app.modules.permissions.router import router as roles_router
    from app.modules.products.router import router as products_router
    from app.modules.returns.router import router as returns_router
    from app.modules.settings.router import router as settings_router
    from app.modules.suppliers.router import router as suppliers_router
    from app.modules.uploads.router import router as uploads_router
    from app.modules.users.router import router as users_router
    from app.modules.vouchers.router import router as vouchers_router
    from app.modules.warranties.router import router as warranties_router

    return [
        auth_router,
        user_router,
        org_router,
        users_router,
        roles_router,
        permissions_router,
        log_router,
        settings_router,
        suppliers_router,
        products_router,
        inventory_router,
        payments_router,
        partner_router,
        orders_router,
        invoices_router,
        warranties_router,
        returns_router,
        vouchers_router,
        uploads_router,
    ]


def register_routers(app: FastAPI) -> None:
    """Gắn health check + toàn bộ router module vào app dưới tiền tố API."""
    prefix = settings.api_prefix
    app.include_router(health_router, prefix=prefix)
    for router in _collect_routers():
        app.include_router(router, prefix=prefix)
