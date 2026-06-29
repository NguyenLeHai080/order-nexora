"""Service Warranties — tạo phiếu bảo hành khi đơn thành công + claim/void.

Auto-create trong `orders.service.purchase` (nhánh success) khi product có
`warranty_days > 0`. Dùng `commit=False` để ride trên transaction của purchase.
"""
from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.orders.models import Order
from app.modules.products.models import Product
from app.modules.warranties.models import Warranty


def _gen_code() -> str:
    return f"WR-{secrets.token_hex(4).upper()}"


def create_for_order(
    db: Session,
    order: Order,
    product: Product,
    *,
    commit: bool = True,
) -> Warranty | None:
    """Tạo phiếu bảo hành nếu sản phẩm có warranty_days > 0, ngược lại None."""
    days = product.warranty_days or 0
    if days <= 0:
        return None

    now = datetime.now(UTC)
    warranty = Warranty(
        code=_gen_code(),
        order_id=order.id,
        product_name=order.product_name,
        user_id=order.user_id,
        starts_at=now,
        ends_at=now + timedelta(days=days),
        status="active",
        organization_id=order.organization_id,
    )
    db.add(warranty)
    if commit:
        db.commit()
        db.refresh(warranty)
    return warranty


def void_for_order(db: Session, order_id: int, *, commit: bool = True) -> None:
    """Vô hiệu phiếu bảo hành của đơn (khi hủy đơn / hoàn trả)."""
    warranty = db.scalar(select(Warranty).where(Warranty.order_id == order_id))
    if warranty is not None and warranty.status in {"active", "expired"}:
        warranty.status = "void"
        if commit:
            db.commit()
