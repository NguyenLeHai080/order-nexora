"""Model Voucher — mã giảm giá theo số tiền hoặc phần trăm, giới hạn thời gian."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class Voucher(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "vouchers"

    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    discount_type: Mapped[str] = mapped_column(String(20), default="amount")  # amount | percent
    discount_value: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    # Giảm tối đa (áp cho percent), 0 = không giới hạn.
    max_discount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))

    usage_limit: Mapped[int] = mapped_column(Integer, default=0)  # 0 = không giới hạn
    used_count: Mapped[int] = mapped_column(Integer, default=0)

    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
