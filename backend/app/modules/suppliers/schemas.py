"""Schemas cho module Suppliers (kiêm cấu hình provider API).

Driver được validate động theo registry (driver đã đăng ký ∪ "manual") thay vì
regex cứng — thêm driver mới không phải sửa file này. Secrets nằm trong cột JSON
`config` (hoặc cột key/secret cũ của vdstore) và KHÔNG bao giờ trả ra FE; chỉ trả
cờ `configured`/`has_*` cho biết đã cấu hình hay chưa.
"""
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

_ENV = "^(test|live)$"
_STATUS = "^(active|inactive)$"


def _validate_driver(value: str | None) -> str | None:
    """Driver hợp lệ = đã đăng ký trong registry hoặc 'manual' (NCC nhập tay)."""
    if value is None:
        return value
    from app.integrations import registry

    allowed = set(registry.list_drivers()) | {"manual"}
    if value not in allowed:
        raise ValueError(f"Driver '{value}' không hợp lệ. Cho phép: {', '.join(sorted(allowed))}.")
    return value


class SupplierCreate(BaseModel):
    name: str
    driver: str = "manual"
    api_endpoint: str | None = None
    environment: str = Field("test", pattern=_ENV)
    api_key_test: str | None = None
    api_key_live: str | None = None
    api_key: str | None = None
    webhook_secret_test: str | None = None
    webhook_secret_live: str | None = None
    config: dict | None = None
    status: str = Field("active", pattern=_STATUS)
    note: str | None = None

    _check_driver = field_validator("driver")(_validate_driver)


class SupplierUpdate(BaseModel):
    name: str | None = None
    driver: str | None = None
    api_endpoint: str | None = None
    environment: str | None = Field(None, pattern=_ENV)
    api_key_test: str | None = None
    api_key_live: str | None = None
    api_key: str | None = None
    webhook_secret_test: str | None = None
    webhook_secret_live: str | None = None
    config: dict | None = None
    status: str | None = Field(None, pattern=_STATUS)
    note: str | None = None

    _check_driver = field_validator("driver")(_validate_driver)


class SupplierOut(BaseModel):
    id: int
    name: str
    driver: str
    api_endpoint: str | None
    environment: str
    status: str
    note: str | None
    organization_id: int | None
    created_at: datetime | None
    updated_at: datetime | None

    # Cờ cho FE biết đã cấu hình key/secret hay chưa (không lộ giá trị thật).
    has_api_key_test: bool = False
    has_api_key_live: bool = False
    has_webhook_secret_test: bool = False
    has_webhook_secret_live: bool = False

    # Map field cấu hình (theo descriptor của driver) đã có giá trị hay chưa.
    configured: dict[str, bool] = {}

    model_config = {"from_attributes": True}

    # Không trả api_key/webhook_secret/config secret ra ngoài để tránh lộ.
