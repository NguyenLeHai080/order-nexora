"""Schemas cho module Permissions/Roles."""
from pydantic import BaseModel, Field


class PermissionOut(BaseModel):
    id: int
    name: str
    description: str | None

    model_config = {"from_attributes": True}


class RoleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    permission_ids: list[int] = []


class RoleUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    permission_ids: list[int] | None = None


class RoleOut(BaseModel):
    id: int
    name: str
    description: str | None
    permission_ids: list[int] = []
    permissions: list[str] = []

    model_config = {"from_attributes": True}
