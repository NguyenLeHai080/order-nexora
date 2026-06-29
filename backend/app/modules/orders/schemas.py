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
    profit: Decimal
    status: str
    delivered_content: str | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class ProfitSummary(BaseModel):
    """Tổng hợp lợi nhuận trong một khoảng (chỉ tính đơn success)."""

    revenue: Decimal  # tổng tiền khách trả
    cost: Decimal  # tổng giá vốn nhà cung cấp
    profit: Decimal  # revenue - cost
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
