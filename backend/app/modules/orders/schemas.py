"""Schemas cho module Orders."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator


class OrderCreate(BaseModel):
    """Khách mua sản phẩm. Giá lấy từ product, không cho client tự gửi giá."""

    product_id: int
    quantity: int = Field(1, ge=1)
    voucher_code: str | None = None


class GuestOrderItem(BaseModel):
    product_id: int
    quantity: int = Field(1, ge=1)


class GuestOrderCreate(BaseModel):
    """Khách vãng lai (chưa đăng nhập) đặt đơn — trả QR để chuyển khoản trực tiếp."""

    items: list[GuestOrderItem] = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=120)
    phone: str | None = Field(None, max_length=30)
    email: str | None = Field(None, max_length=255)

    @model_validator(mode="after")
    def _require_contact(self) -> "GuestOrderCreate":
        if not (self.phone and self.phone.strip()) and not (self.email and self.email.strip()):
            raise ValueError("Vui lòng nhập số điện thoại hoặc email để nhận thông báo đơn hàng.")
        return self


class OrderFulfill(BaseModel):
    """Admin duyệt đơn: thành công (kèm nội dung giao) hoặc thất bại."""

    result: str = Field(..., pattern="^(success|failed)$")
    delivered_content: str | None = None
    note: str | None = None


class OrderRefund(BaseModel):
    """Admin đánh dấu đã hoàn tiền tay cho đơn guest thất bại."""

    note: str | None = None


class OrderOut(BaseModel):
    id: int
    code: str
    user_id: int | None = None
    guest_name: str | None = None
    guest_phone: str | None = None
    guest_email: str | None = None
    product_id: int | None
    product_name: str
    unit_price: Decimal
    quantity: int
    total_amount: Decimal
    unit_cost: Decimal
    total_cost: Decimal
    supplier_id: int | None = None
    supplier_payable: Decimal
    owner_user_id: int | None = None
    owner_profit: Decimal
    fulfillment_type: str | None = None
    manual_fulfillment_required: bool = False
    manual_contact_name: str | None = None
    manual_contact_url: str | None = None
    manual_qr_image_url: str | None = None
    profit: Decimal
    status: str
    payment_status: str = "unpaid"
    payment_reference: str | None = None
    paid_at: datetime | None = None
    delivered_content: str | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class OrderCustomerOut(BaseModel):
    """Đơn hàng — góc nhìn KHÁCH: KHÔNG lộ giá vốn/lãi/nhà cung cấp/owner.

    Dùng cho GET /orders/me, tra cứu đơn guest và chi tiết đơn của chính khách.
    Tuyệt đối không thêm unit_cost/total_cost/supplier_*/owner_*/profit/
    payment_reference/lookup_token vào đây.
    """

    id: int
    code: str
    product_name: str
    unit_price: Decimal
    quantity: int
    total_amount: Decimal
    fulfillment_type: str | None = None
    manual_fulfillment_required: bool = False
    manual_contact_name: str | None = None
    manual_contact_url: str | None = None
    manual_qr_image_url: str | None = None
    status: str
    payment_status: str = "unpaid"
    paid_at: datetime | None = None
    delivered_content: str | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class ProfitSummary(BaseModel):
    """Tổng hợp lợi nhuận trong một khoảng (chỉ tính đơn success)."""

    revenue: Decimal  # tổng tiền khách trả
    cost: Decimal  # tổng giá vốn nhà cung cấp
    profit: Decimal  # revenue - cost
    supplier_payable: Decimal = Decimal("0.00")
    owner_profit: Decimal = Decimal("0.00")
    owner_wallet_user_id: int | None = None
    owner_wallet_balance: Decimal | None = None
    margin_percent: float  # biên lợi nhuận = profit / revenue * 100
    order_count: int


class ProfitByProduct(BaseModel):
    """Lợi nhuận gộp theo từng sản phẩm."""

    product_id: int | None
    product_name: str
    revenue: Decimal
    cost: Decimal
    profit: Decimal
    order_count: int


class LeaderboardItem(BaseModel):
    user_id: int
    user_name: str
    total_spent: Decimal
    order_count: int
