"""Schemas cho module Warranties."""
from datetime import datetime

from pydantic import BaseModel


class WarrantyClaimBody(BaseModel):
    claim_note: str | None = None


class WarrantyOut(BaseModel):
    id: int
    code: str
    order_id: int | None
    product_name: str
    user_id: int | None
    starts_at: datetime | None
    ends_at: datetime | None
    status: str
    claim_note: str | None
    created_at: datetime | None

    model_config = {"from_attributes": True}
