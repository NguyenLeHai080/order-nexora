"""Model Product — sản phẩm số lấy giá vốn (CTV) từ supplier.

Mô hình "3 giá" NCC:
- base_price  : giá CTV / giá vốn (price bên NCC) — phần trả lại NCC.
- regular_price: giá niêm yết NCC (regularPrice) — mặc định là giá bán cho khách.
- provider_discount_percent: % chiết khấu CTV (tham khảo).

Giá bán = list_price × (1 + markup_percent/100) + markup_amount,
trong đó list_price = regular_price (nếu có) hoặc base_price (fallback).
Markup mặc định 0 → giá bán = giá niêm yết; lợi nhuận/sp = sale_price − base_price.
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
    # Tên tiếng Anh + danh mục lấy từ nhà cung cấp (chỉ để hiển thị/lọc).
    name_en: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category_name: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    # Danh mục nội bộ (bảng categories). Sync NCC sẽ get-or-create theo category_name.
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Ảnh đại diện sản phẩm (upload nội bộ hoặc dán URL ngoài).
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Mã sản phẩm phía nhà cung cấp (để gọi API mua real-time).
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Giá vốn / giá CTV lấy từ kho bên thứ 3 — phần phải trả lại NCC.
    base_price: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    # Giá niêm yết gốc bên NCC (regularPrice) — mặc định dùng làm giá bán cho khách.
    regular_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    # % chiết khấu CTV bên NCC (collaboratorDiscountPercent) — tham khảo.
    provider_discount_percent: Mapped[Decimal | None] = mapped_column(Numeric(7, 2), nullable=True)
    # Kiểu giao của NCC: STOCK_ITEM | SHARED_CONTENT | MANUAL.
    delivery_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    # Số lượng còn phía NCC (availableQuantity) — snapshot lúc sync, khác cột quantity local.
    provider_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Công thức tăng giá (cộng thêm trên giá niêm yết, mặc định 0).
    markup_percent: Mapped[Decimal] = mapped_column(Numeric(7, 2), default=Decimal("0.00"))
    markup_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))

    stock_status: Mapped[str] = mapped_column(String(20), default="in_stock")  # in_stock | out_of_stock
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    sold_count: Mapped[int] = mapped_column(Integer, default=0)

    # Tồn kho số local — CHỈ áp cho sản phẩm tự quản kho (không có NCC tạo đơn).
    # Sản phẩm NCC (driver có capability "orders") giữ stock_status từ catalog sync,
    # không bao giờ dùng cột quantity này. Mọi thay đổi quantity đi qua inventory.apply_movement.
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    # Ngưỡng cảnh báo sắp hết (0 = không cảnh báo). Chỉ ý nghĩa với sản phẩm kho riêng.
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=0)
    # Số ngày bảo hành mặc định khi bán (0 = không tạo phiếu bảo hành).
    warranty_days: Mapped[int] = mapped_column(Integer, default=0)

    @property
    def list_price(self) -> Decimal:
        """Giá niêm yết dùng làm gốc tính giá bán (regular_price, fallback base_price)."""
        if self.regular_price is not None:
            return self.regular_price
        return self.base_price or Decimal("0")

    @property
    def sale_price(self) -> Decimal:
        """Giá bán = giá niêm yết × (1 + markup_percent/100) + markup_amount."""
        percent_factor = Decimal("1") + (self.markup_percent or Decimal("0")) / Decimal("100")
        return self.list_price * percent_factor + (self.markup_amount or Decimal("0"))

