"""Schemas cho Setting."""
from pydantic import BaseModel


class SettingUpsert(BaseModel):
    key: str
    value: str
    description: str | None = None


class MaintenanceToggle(BaseModel):
    enabled: bool
