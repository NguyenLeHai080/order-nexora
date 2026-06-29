"""Schemas cho module Invoices."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class InvoiceOut(BaseModel):
    id: int
    code: str
    order_id: int | None
    user_id: int | None
    customer_name: str | None
    customer_email: str | None
    product_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    status: str
    issued_at: datetime | None
    created_at: datetime | None

    model_config = {"from_attributes": True}
