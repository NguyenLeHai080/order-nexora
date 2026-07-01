"""Schemas cho module Categories."""
from datetime import datetime

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str
    slug: str | None = None
    description: str | None = None
    sort_order: int = 0
    status: str = Field("active", pattern="^(active|inactive)$")


class CategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    sort_order: int | None = None
    status: str | None = Field(None, pattern="^(active|inactive)$")


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    sort_order: int
    status: str
    organization_id: int | None
    product_count: int = 0
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}
