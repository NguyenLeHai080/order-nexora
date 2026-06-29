"""Schemas cho Organization."""
from datetime import datetime

from pydantic import BaseModel, Field


class OrganizationCreate(BaseModel):
    name: str = Field(..., examples=["Công ty A"])
    slug: str | None = None
    description: str | None = None
    status: str = Field("active", pattern="^(active|inactive)$")
    parent_id: int | None = None
    sort_order: int = 0


class OrganizationUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    status: str | None = Field(None, pattern="^(active|inactive)$")
    parent_id: int | None = None
    sort_order: int | None = None


class OrganizationOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    status: str
    parent_id: int | None
    sort_order: int
    depth: int
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class BulkIdsRequest(BaseModel):
    ids: list[int]


class BulkStatusRequest(BaseModel):
    ids: list[int]
    status: str = Field(..., pattern="^(active|inactive)$")
