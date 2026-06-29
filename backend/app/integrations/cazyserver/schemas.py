"""DTO khớp JSON Cazyserver (reseller domain API).

Shape dựa trên tài liệu tóm tắt: /account, /account/balance, /domains. Các DTO
domain register/renew là scaffold — bổ sung field khi có response thật. Dùng
`populate_by_name + extra=ignore` để dung sai với field thừa/đổi tên.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class _CazyModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class CazyAccount(_CazyModel):
    """GET /account — thông tin tài khoản reseller."""

    id: str | None = None
    email: str | None = None
    name: str | None = None
    status: str | None = None


class CazyBalance(_CazyModel):
    """GET /account/balance — số dư tín dụng."""

    currency: str = "USD"
    balance: float = 0.0


class CazyDomain(_CazyModel):
    """Một tên miền trong danh sách."""

    domain: str | None = None
    status: str | None = None
    expires_at: str | None = Field(default=None, alias="expiresAt")
    locked: bool | None = None


class CazyDomainList(_CazyModel):
    """GET /domains — danh sách tên miền."""

    data: list[CazyDomain] = Field(default_factory=list)
    total: int | None = None
