"""Model Invoice — hóa đơn bán hàng.

Mỗi đơn hiện tại mua đúng 1 sản phẩm nên hóa đơn lưu snapshot phẳng (không cần
InvoiceItem). Khi nào hỗ trợ giỏ hàng nhiều sản phẩm mới tách line-items.
Lưu snapshot thông tin khách + sản phẩm để hóa đơn không đổi khi dữ liệu gốc đổi.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class Invoice(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "invoices"

    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Snapshot khách hàng.
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Snapshot sản phẩm + tiền.
    product_name: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    discount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    total: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))

    # issued | paid | cancelled | refunded
    status: Mapped[str] = mapped_column(String(20), default="paid", index=True)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
