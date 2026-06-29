"""Model ReturnRequest — yêu cầu đổi/trả của khách cho một đơn đã thành công.

Vòng đời: requested -> approved/rejected -> completed. Khi completed:
- return: hoàn ví + hồi kho sản phẩm gốc + đơn -> cancelled.
- exchange: xuất kho sản phẩm mới + hồi kho sản phẩm gốc + cộng/trừ ví theo
  chênh giá. Lưu snapshot lý do + ghi chú xử lý.
"""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class ReturnRequest(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "return_requests"

    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # return | exchange
    kind: Mapped[str] = mapped_column(String(20), index=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # requested | approved | rejected | completed
    status: Mapped[str] = mapped_column(String(20), default="requested", index=True)

    refund_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    # Sản phẩm thay thế (chỉ dùng cho kind=exchange).
    exchange_product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
