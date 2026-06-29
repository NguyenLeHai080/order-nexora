"""Schemas cho LogActivity."""
from datetime import date

from pydantic import BaseModel


class DeleteByDateRequest(BaseModel):
    from_date: date
    to_date: date


class BulkIdsRequest(BaseModel):
    ids: list[int]
