"""Model Order — đơn mua sản phẩm số của khách.

Lưu giá bán tại thời điểm mua (snapshot) để không bị lệch khi giá đổi sau này.
Đồng thời snapshot giá vốn (giá nhà cung cấp) để tính lợi nhuận = giá bán - giá vốn.
delivered_content giữ "hàng" trả về từ nhà cung cấp (link/key/tài liệu).
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class Order(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "orders"

    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # Nullable: đơn của khách vãng lai (guest checkout) không có user_id.
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # Thông tin liên hệ khách vãng lai (khi user_id is None).
    guest_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    guest_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    guest_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    product_name: Mapped[str] = mapped_column(String(255))

    # Snapshot giá tại thời điểm mua.
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    quantity: Mapped[int] = mapped_column(default=1)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))

    # Snapshot giá vốn (giá nhà cung cấp) tại thời điểm mua — để tính lợi nhuận.
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    total_cost: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    supplier_payable: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    owner_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    owner_profit: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    fulfillment_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    manual_fulfillment_required: Mapped[bool] = mapped_column(Boolean, default=False)
    manual_contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    manual_contact_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    manual_qr_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="processing", index=True)
    # awaiting_payment | processing | success | failed | cancelled
    delivered_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Thanh toán trực tiếp theo đơn (guest checkout — không qua ví).
    payment_status: Mapped[str] = mapped_column(String(20), default="unpaid", index=True)
    # unpaid | paid — đơn ví logged-in tạo ra set luôn 'paid'.
    payment_reference: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    lookup_token: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def is_guest(self) -> bool:
        return self.user_id is None

    @property
    def profit(self) -> Decimal:
        """Lợi nhuận = tổng tiền khách trả - tổng giá vốn nhà cung cấp."""
        return (self.total_amount or Decimal("0")) - (self.total_cost or Decimal("0"))
