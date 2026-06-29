"""Tham số phân trang, lọc, sắp xếp dùng chung cho mọi endpoint list.

Bám theo quy ước dự án tham chiếu: search, status, from_date, to_date,
sort_by, sort_order, limit (1-100), page.
"""
from datetime import date

from fastapi import Query
from pydantic import BaseModel


class ListParams(BaseModel):
    search: str | None = None
    status: str | None = None
    supplier_id: int | None = None
    from_date: date | None = None
    to_date: date | None = None
    sort_by: str = "created_at"
    sort_order: str = "desc"
    limit: int = 10
    page: int = 1

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


def list_params(
    search: str | None = Query(None, description="Từ khóa tìm kiếm"),
    status: str | None = Query(None, description="Lọc theo trạng thái"),
    supplier_id: int | None = Query(None, description="Lọc theo nhà cung cấp"),
    from_date: date | None = Query(None, description="Lọc từ ngày (Y-m-d)"),
    to_date: date | None = Query(None, description="Lọc đến ngày (Y-m-d)"),
    sort_by: str = Query("created_at", max_length=50, description="Trường sắp xếp"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="asc | desc"),
    limit: int = Query(10, ge=1, le=100, description="Số bản ghi mỗi trang (1-100)"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
) -> ListParams:
    """Dependency gom các query param chuẩn thành ListParams."""
    return ListParams(
        search=search,
        status=status,
        supplier_id=supplier_id,
        from_date=from_date,
        to_date=to_date,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        page=page,
    )
