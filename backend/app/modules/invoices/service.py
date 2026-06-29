"""Service Invoices — phát hành hóa đơn khi đơn thành công + đổi trạng thái.

Hóa đơn được phát hành tự động trong luồng `orders.service.purchase` (nhánh
success). Dùng `commit=False` để ride trên transaction của purchase.
"""
from __future__ import annotations

import secrets
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.invoices.models import Invoice
from app.modules.orders.models import Order
from app.modules.products.models import Product
from app.modules.users.models import User


def _gen_code() -> str:
    return f"INV-{secrets.token_hex(4).upper()}"


def issue_for_order(
    db: Session,
    order: Order,
    product: Product,
    user: User | None,
    *,
    commit: bool = True,
) -> Invoice:
    """Phát hành hóa đơn `paid` cho một đơn thành công.

    subtotal = đơn giá × số lượng (trước voucher); discount = subtotal − total;
    total = số tiền khách thực trả (đã áp voucher).
    """
    subtotal = (order.unit_price or Decimal("0")) * Decimal(order.quantity or 1)
    total = order.total_amount or Decimal("0")
    discount = subtotal - total
    if discount < 0:
        discount = Decimal("0")

    invoice = Invoice(
        code=_gen_code(),
        order_id=order.id,
        user_id=order.user_id,
        customer_name=user.name if user else None,
        customer_email=user.email if user else None,
        product_name=order.product_name,
        quantity=order.quantity or 1,
        unit_price=order.unit_price or Decimal("0"),
        subtotal=subtotal,
        discount=discount,
        total=total,
        status="paid",
        issued_at=datetime.now(UTC),
        organization_id=order.organization_id,
    )
    db.add(invoice)
    if commit:
        db.commit()
        db.refresh(invoice)
    return invoice


def mark_refunded_for_order(db: Session, order_id: int, *, commit: bool = True) -> None:
    """Đổi hóa đơn của đơn sang refunded (khi hủy đơn / hoàn trả)."""
    invoice = db.scalar(select(Invoice).where(Invoice.order_id == order_id))
    if invoice is not None and invoice.status not in {"refunded", "cancelled"}:
        invoice.status = "refunded"
        if commit:
            db.commit()
