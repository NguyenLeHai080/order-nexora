"""Schemas cho module Vouchers."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class VoucherCreate(BaseModel):
    code: str
    description: str | None = None
    discount_type: str = Field("amount", pattern="^(amount|percent)$")
    discount_value: Decimal = Field(..., ge=0)
    max_discount: Decimal = Decimal("0.00")
    usage_limit: int = 0
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: str = Field("active", pattern="^(active|inactive)$")


class VoucherUpdate(BaseModel):
    description: str | None = None
    discount_type: str | None = Field(None, pattern="^(amount|percent)$")
    discount_value: Decimal | None = Field(None, ge=0)
    max_discount: Decimal | None = None
    usage_limit: int | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: str | None = Field(None, pattern="^(active|inactive)$")


class VoucherOut(BaseModel):
    id: int
    code: str
    description: str | None
    discount_type: str
    discount_value: Decimal
    max_discount: Decimal
    usage_limit: int
    used_count: int
    starts_at: datetime | None
    ends_at: datetime | None
    status: str
    created_at: datetime | None

    model_config = {"from_attributes": True}
