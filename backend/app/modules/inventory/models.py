"""Model StockMovement — sổ kho: mỗi dòng là một lần nhập/xuất/điều chỉnh/hoàn.

Nguồn sự thật cho tồn kho local là `Product.quantity`; bảng này là sổ cái
(ledger) ghi lại từng biến động kèm số dư sau biến động (balance_after) để
truy vết. Mọi thay đổi quantity phải đi qua `inventory.service.apply_movement`
— không sửa Product.quantity trực tiếp ở nơi khác.

Sổ cái cũng ghi dòng tiền: `cash_in` (thu — doanh thu khi bán), `cash_out`
(chi — tiền mua hàng nhập kho hoặc giá vốn đơn NCC). Với sản phẩm NCC (tồn nằm
bên họ) ta ghi dòng tiền-thuần (`tracks_stock=False`): không đổi tồn local
nhưng vẫn vào sổ thu/chi để tính lợi nhuận.
"""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class StockMovement(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "stock_movements"

    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    product_name: Mapped[str] = mapped_column(String(255))  # snapshot phòng khi product bị xóa

    # in | out | adjust | return
    type: Mapped[str] = mapped_column(String(20), index=True)
    quantity_delta: Mapped[int] = mapped_column(Integer)  # có dấu: +nhập / -xuất
    balance_after: Mapped[int] = mapped_column(Integer)  # tồn local sau biến động

    # True = dòng có đổi tồn local; False = dòng tiền-thuần (đơn NCC, tồn bên họ).
    tracks_stock: Mapped[bool] = mapped_column(Boolean, default=True)

    # Dòng tiền (đồng): cash_in = thu (doanh thu), cash_out = chi (giá vốn/nhập hàng).
    unit_cost: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    cash_in: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    cash_out: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))

    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Liên kết nguồn gốc: order | return | manual
    ref_type: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    ref_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
