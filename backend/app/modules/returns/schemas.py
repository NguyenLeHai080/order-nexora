"""Schemas cho module Returns."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ReturnCreate(BaseModel):
    order_id: int
    kind: str = Field(..., pattern="^(return|exchange)$")
    reason: str | None = None
    # Bắt buộc khi kind=exchange.
    exchange_product_id: int | None = None


class ReturnRejectBody(BaseModel):
    resolution_note: str | None = None


class ReturnOut(BaseModel):
    id: int
    code: str
    order_id: int | None
    user_id: int | None
    kind: str
    reason: str | None
    status: str
    refund_amount: Decimal
    exchange_product_id: int | None
    resolution_note: str | None
    created_at: datetime | None

    model_config = {"from_attributes": True}
