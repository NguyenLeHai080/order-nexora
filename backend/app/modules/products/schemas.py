"""Schemas cho module Products."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str
    slug: str | None = None
    description: str | None = None
    supplier_id: int | None = None
    external_id: str | None = None
    base_price: Decimal = Decimal("0.00")
    markup_percent: Decimal = Decimal("0.00")
    markup_amount: Decimal = Decimal("0.00")
    status: str = Field("active", pattern="^(active|inactive)$")


class ProductUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    supplier_id: int | None = None
    external_id: str | None = None
    base_price: Decimal | None = None
    markup_percent: Decimal | None = None
    markup_amount: Decimal | None = None
    stock_status: str | None = Field(None, pattern="^(in_stock|out_of_stock)$")
    status: str | None = Field(None, pattern="^(active|inactive)$")


class ProductOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    supplier_id: int | None
    external_id: str | None
    base_price: Decimal
    markup_percent: Decimal
    markup_amount: Decimal
    sale_price: Decimal
    stock_status: str
    status: str
    sold_count: int
    organization_id: int | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}
