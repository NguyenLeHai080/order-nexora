"""Schemas cho module Partner (đọc/đối soát tích hợp nhà cung cấp)."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class PartnerWebhookConfigUpdate(BaseModel):
    name: str = "VD Store"
    api_endpoint: str | None = "https://api.vanhdao.io.vn/partner/v1"
    environment: str = Field("test", pattern="^(test|live)$")
    status: str = Field("active", pattern="^(active|inactive)$")
    api_key_test: str | None = None
    api_key_live: str | None = None
    webhook_secret_test: str | None = None
    webhook_secret_live: str | None = None
    note: str | None = None


class PartnerWebhookSecretGenerate(BaseModel):
    environment: str = Field("test", pattern="^(test|live)$")


class PartnerWebhookSecretOut(BaseModel):
    environment: str
    webhook_secret: str
    config: dict


class PartnerWebhookConfigOut(BaseModel):
    supplier_id: int | None = None
    driver: str = "vdstore"
    webhook_path: str
    webhook_url: str
    name: str | None = None
    api_endpoint: str | None = None
    environment: str = "test"
    status: str | None = None
    note: str | None = None
    webhook_secret_test: str | None = None
    webhook_secret_live: str | None = None
    has_api_key_test: bool = False
    has_api_key_live: bool = False
    has_webhook_secret_test: bool = False
    has_webhook_secret_live: bool = False


class ProviderOrderRefOut(BaseModel):
    id: int
    driver: str
    order_id: int
    supplier_id: int | None
    external_order_id: str
    provider_order_id: str | None
    provider_status: str | None
    environment: str
    livemode: bool
    refunded_amount: Decimal
    note: str | None
    organization_id: int | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class ProviderWebhookEventOut(BaseModel):
    id: int
    driver: str
    event_id: str
    event_type: str | None
    provider_order_id: str | None
    livemode: bool
    status: str
    note: str | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class CatalogSyncRequest(BaseModel):
    dry_run: bool = False
    discontinue_missing: bool = True


class CatalogSyncRunOut(BaseModel):
    id: int
    supplier_id: int | None
    driver: str
    supplier_name: str | None
    mode: str
    status: str
    livemode: bool
    total: int
    created_count: int
    updated_count: int
    discontinued_count: int
    reactivated_count: int
    unchanged_count: int
    warning_count: int
    error_count: int
    requested_by: int | None
    started_at: datetime | None
    finished_at: datetime | None
    error_message: str | None
    organization_id: int | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class CatalogSyncItemOut(BaseModel):
    id: int
    run_id: int
    supplier_id: int | None
    product_id: int | None
    external_id: str | None
    product_name: str | None
    action: str
    warning_code: str | None
    note: str | None
    old_base_price: Decimal | None
    new_base_price: Decimal | None
    old_sale_price: Decimal | None
    new_sale_price: Decimal | None
    margin_after: Decimal | None
    stock_status: str | None
    payload: dict | None
    created_at: datetime | None

    model_config = {"from_attributes": True}
