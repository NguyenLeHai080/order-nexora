"""Schemas cho module Users."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    user_name: str | None = None
    password: str = Field(..., min_length=6)
    status: str = Field("active", pattern="^(active|locked)$")
    role_ids: list[int] = []
    organization_ids: list[int] = []


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    user_name: str | None = None
    password: str | None = Field(None, min_length=6)
    status: str | None = Field(None, pattern="^(active|locked)$")
    role_ids: list[int] | None = None


class UserSelfUpdate(BaseModel):
    """Khách tự cập nhật hồ sơ — CHỈ các trường an toàn.

    Cố tình KHÔNG có status/role_ids/balance/organization: khách không được tự
    nâng quyền hay tự sửa số dư.
    """

    name: str | None = None
    email: EmailStr | None = None
    user_name: str | None = None
    password: str | None = Field(None, min_length=6)


class UserOut(BaseModel):
    id: int
    name: str
    user_name: str | None
    email: str
    status: str
    balance: Decimal
    role_ids: list[int] = []
    roles: list[str] = []
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class BalanceAdjust(BaseModel):
    """Admin cộng/trừ tiền tay cho user."""

    amount: Decimal = Field(..., description="Số tiền (>0 cộng, <0 trừ)")
    note: str | None = None


class BulkIdsRequest(BaseModel):
    ids: list[int]


class BulkStatusRequest(BaseModel):
    ids: list[int]
    status: str = Field(..., pattern="^(active|locked)$")
