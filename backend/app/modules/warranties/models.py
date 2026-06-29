"""Model Warranty — phiếu bảo hành tạo tự động khi đơn thành công.

Chỉ tạo khi `Product.warranty_days > 0`. Lưu snapshot tên sản phẩm để phiếu
không đổi khi sản phẩm gốc thay đổi/bị xóa.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class Warranty(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "warranties"

    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True
    )
    product_name: Mapped[str] = mapped_column(String(255))
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # active | expired | claimed | void
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    claim_note: Mapped[str | None] = mapped_column(Text, nullable=True)
