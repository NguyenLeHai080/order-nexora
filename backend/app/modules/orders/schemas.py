"""Schemas cho module Orders."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class OrderCreate(BaseModel):
    """Khách mua sản phẩm. Giá lấy từ product, không cho client tự gửi giá."""

    product_id: int
    quantity: int = Field(1, ge=1)
    voucher_code: str | None = None


class OrderOut(BaseModel):
    id: int
    code: str
    user_id: int
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
    delivered_content: str | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class OrderCustomerOut(BaseModel):
    """Đơn hàng — góc nhìn KHÁCH: KHÔNG lộ giá vốn/lãi/nhà cung cấp/owner.

    Dùng cho GET /orders/me và chi tiết đơn của chính khách. Tuyệt đối không thêm
    unit_cost/total_cost/supplier_*/owner_*/profit vào đây.
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
