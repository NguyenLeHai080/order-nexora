"""Schemas cho module Finance."""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# ── Sổ cái ví ────────────────────────────────────────────────────────────────

class WalletTxnOut(BaseModel):
    id: int
    user_id: int
    type: str
    direction: str
    amount: Decimal
    balance_after: Decimal
    ref_type: str | None = None
    ref_id: int | None = None
    note: str | None = None
    actor_id: int | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Phiếu thu/chi ─────────────────────────────────────────────────────────────

class CashEntryCreate(BaseModel):
    kind: str = Field(..., pattern="^(income|expense)$")
    amount: Decimal = Field(..., gt=0)
    category: str | None = Field(None, max_length=100)
    note: str | None = None
    occurred_on: date


class CashEntryUpdate(BaseModel):
    kind: str | None = Field(None, pattern="^(income|expense)$")
    amount: Decimal | None = Field(None, gt=0)
    category: str | None = Field(None, max_length=100)
    note: str | None = None
    occurred_on: date | None = None


class CashEntryOut(BaseModel):
    id: int
    kind: str
    amount: Decimal
    category: str | None = None
    note: str | None = None
    occurred_on: date
    actor_id: int | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Rút tiền ─────────────────────────────────────────────────────────────────

class WithdrawalCreate(BaseModel):
    """Admin tạo hộ (kèm user_id) hoặc khách tự tạo (user_id lấy từ token)."""

    user_id: int | None = None
    amount: Decimal = Field(..., gt=0)
    bank_info: str | None = Field(None, max_length=255)
    note: str | None = None


class WithdrawalReject(BaseModel):
    note: str | None = None


class WithdrawalOut(BaseModel):
    id: int
    user_id: int
    amount: Decimal
    status: str
    bank_info: str | None = None
    note: str | None = None
    actor_id: int | None = None
    processed_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Tất toán NCC ──────────────────────────────────────────────────────────────

class SettlementCreate(BaseModel):
    supplier_id: int
    amount: Decimal = Field(..., gt=0)
    note: str | None = None


class SettlementOut(BaseModel):
    id: int
    supplier_id: int
    amount: Decimal
    note: str | None = None
    actor_id: int | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
