"""Model Product — sản phẩm số lấy giá gốc từ supplier, áp công thức tăng giá.

Giá bán = giá kho × (1 + markup_percent/100) + markup_amount
"""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class Product(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Mã sản phẩm phía nhà cung cấp (để gọi API mua real-time).
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Giá gốc lấy từ kho bên thứ 3.
    base_price: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    # Công thức tăng giá.
    markup_percent: Mapped[Decimal] = mapped_column(Numeric(7, 2), default=Decimal("0.00"))
    markup_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))

    stock_status: Mapped[str] = mapped_column(String(20), default="in_stock")  # in_stock | out_of_stock
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    sold_count: Mapped[int] = mapped_column(Integer, default=0)

    @property
    def sale_price(self) -> Decimal:
        """Giá bán tính theo công thức markup."""
        percent_factor = Decimal("1") + (self.markup_percent or Decimal("0")) / Decimal("100")
        return (self.base_price or Decimal("0")) * percent_factor + (self.markup_amount or Decimal("0"))
