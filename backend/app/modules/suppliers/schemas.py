"""Schemas cho module Suppliers."""
from datetime import datetime

from pydantic import BaseModel, Field


class SupplierCreate(BaseModel):
    name: str
    api_endpoint: str | None = None
    api_key: str | None = None
    status: str = Field("active", pattern="^(active|inactive)$")
    note: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = None
    api_endpoint: str | None = None
    api_key: str | None = None
    status: str | None = Field(None, pattern="^(active|inactive)$")
    note: str | None = None


class SupplierOut(BaseModel):
    id: int
    name: str
    api_endpoint: str | None
    status: str
    note: str | None
    organization_id: int | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}

    # Không trả api_key ra ngoài để tránh lộ secret.
