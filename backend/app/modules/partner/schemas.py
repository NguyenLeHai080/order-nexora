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
