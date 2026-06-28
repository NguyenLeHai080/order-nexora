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
    status: str
    delivered_content: str | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class LeaderboardItem(BaseModel):
    user_id: int
    user_name: str
    total_spent: Decimal
    order_count: int
