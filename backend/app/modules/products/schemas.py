"""Schemas cho module Products."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str
    slug: str | None = None
    description: str | None = None
    category_id: int | None = None
    image_url: str | None = Field(None, max_length=500)
    supplier_id: int | None = None
    external_id: str | None = None
    base_price: Decimal = Decimal("0.00")
    regular_price: Decimal | None = None
    delivery_type: str | None = Field(None, pattern="^(STOCK_ITEM|SHARED_CONTENT|MANUAL)$")
    markup_percent: Decimal = Decimal("0.00")
    markup_amount: Decimal = Decimal("0.00")
    quantity: int = Field(0, ge=0)
    low_stock_threshold: int = Field(0, ge=0)
    warranty_days: int = Field(0, ge=0)
    status: str = Field("active", pattern="^(active|inactive)$")


class ProductUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    category_id: int | None = None
    image_url: str | None = Field(None, max_length=500)
    supplier_id: int | None = None
    external_id: str | None = None
    base_price: Decimal | None = None
    regular_price: Decimal | None = None
    delivery_type: str | None = Field(None, pattern="^(STOCK_ITEM|SHARED_CONTENT|MANUAL)$")
    markup_percent: Decimal | None = None
    markup_amount: Decimal | None = None
    warranty_days: int | None = Field(None, ge=0)
    low_stock_threshold: int | None = Field(None, ge=0)
    stock_status: str | None = Field(None, pattern="^(in_stock|out_of_stock)$")
    status: str | None = Field(None, pattern="^(active|inactive)$")


class ApplyMarkupRequest(BaseModel):
    """Áp markup hàng loạt. markup_percent=None -> dùng default_markup_percent.

    only_unpriced=True chỉ áp cho sản phẩm CHƯA từng đặt giá (markup_percent=0 và
    markup_amount=0) — tránh ghi đè giá admin đã chỉnh tay.
    """

    markup_percent: Decimal | None = Field(None, ge=0)
    only_unpriced: bool = True


class ApplyMarkupResult(BaseModel):
    updated: int
    markup_percent: Decimal


class ProductOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    name_en: str | None = None
    category_name: str | None = None
    category_id: int | None = None
    image_url: str | None = None
    supplier_id: int | None
    supplier_name: str | None = None
    external_id: str | None
    base_price: Decimal
    regular_price: Decimal | None = None
    list_price: Decimal | None = None
    provider_discount_percent: Decimal | None = None
    delivery_type: str | None = None
    provider_quantity: int | None = None
    markup_percent: Decimal
    markup_amount: Decimal
    sale_price: Decimal
    stock_status: str
    status: str
    sold_count: int
    quantity: int
    low_stock_threshold: int
    warranty_days: int
    organization_id: int | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}
