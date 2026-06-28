"""Schemas cho module Payments."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BankAccountCreate(BaseModel):
    bank_name: str
    account_number: str
    account_holder: str
    qr_image_url: str | None = None
    status: str = Field("active", pattern="^(active|inactive)$")


class BankAccountUpdate(BaseModel):
    bank_name: str | None = None
    account_number: str | None = None
    account_holder: str | None = None
    qr_image_url: str | None = None
    status: str | None = Field(None, pattern="^(active|inactive)$")


class BankAccountOut(BaseModel):
    id: int
    bank_name: str
    account_number: str
    account_holder: str
    qr_image_url: str | None
    status: str

    model_config = {"from_attributes": True}


class DepositCreate(BaseModel):
    """User tạo yêu cầu nạp tiền — hệ thống sinh mã định danh + QR."""

    amount: Decimal = Field(..., gt=0)
    bank_account_id: int | None = None
    method: str = Field("qr_auto", pattern="^(bank|qr_auto|manual)$")


class DepositOut(BaseModel):
    id: int
    user_id: int
    amount: Decimal
    reference_code: str
    method: str
    status: str
    note: str | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class WebhookPayload(BaseModel):
    """Dữ liệu webhook từ ngân hàng/bên thứ 3 báo có tiền vào."""

    reference_code: str
    amount: Decimal
    # Chữ ký HMAC để xác thực nguồn gọi (chống fake hóa đơn).
    signature: str


class ManualConfirm(BaseModel):
    """Admin xác nhận thủ công một giao dịch nạp."""

    status: str = Field(..., pattern="^(success|failed)$")
    note: str | None = None
