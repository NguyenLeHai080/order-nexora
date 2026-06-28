"""Base repository: gói các thao tác CRUD + list/filter/sort/paginate dùng chung.

Mỗi module kế thừa để khỏi lặp code truy vấn. Bám theo bộ lọc chuẩn
(search, status, from_date, to_date, sort_by, sort_order, limit, page).
"""
from datetime import datetime, time
from typing import Generic, TypeVar

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.orm import Session

from app.core.database import Base
from app.core.pagination import ListParams

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    # Các cột được phép tìm kiếm/sắp xếp — module con override.
    searchable: list[str] = []
    sortable: list[str] = ["id", "created_at", "updated_at"]

    def __init__(self, model: type[ModelT], db: Session):
        self.model = model
        self.db = db

    # ----- truy vấn cơ bản -----
    def get(self, id_: int) -> ModelT | None:
        return self.db.get(self.model, id_)

    def create(self, **data) -> ModelT:
        obj = self.model(**data)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, obj: ModelT, **data) -> ModelT:
        for key, value in data.items():
            if value is not None and hasattr(obj, key):
                setattr(obj, key, value)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: ModelT) -> None:
        self.db.delete(obj)
        self.db.commit()

    def bulk_delete(self, ids: list[int]) -> int:
        count = (
            self.db.query(self.model)
            .filter(self.model.id.in_(ids))  # type: ignore[attr-defined]
            .delete(synchronize_session=False)
        )
        self.db.commit()
        return count

    # ----- list + filter + sort + paginate -----
    def _apply_filters(self, stmt, params: ListParams, organization_id: int | None):
        model = self.model

        # Scope theo tổ chức nếu model có cột organization_id.
        if organization_id is not None and hasattr(model, "organization_id"):
            stmt = stmt.where(model.organization_id == organization_id)

        if params.search and self.searchable:
            like = f"%{params.search}%"
            conds = [getattr(model, col).ilike(like) for col in self.searchable if hasattr(model, col)]
            if conds:
                stmt = stmt.where(or_(*conds))

        if params.status and hasattr(model, "status"):
            stmt = stmt.where(model.status == params.status)

        if params.from_date and hasattr(model, "created_at"):
            stmt = stmt.where(model.created_at >= datetime.combine(params.from_date, time.min))
        if params.to_date and hasattr(model, "created_at"):
            stmt = stmt.where(model.created_at <= datetime.combine(params.to_date, time.max))

        return stmt

    def paginate(self, params: ListParams, organization_id: int | None = None) -> tuple[list[ModelT], int]:
        stmt = select(self.model)
        stmt = self._apply_filters(stmt, params, organization_id)

        # Đếm tổng trước khi phân trang.
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        # Sắp xếp an toàn theo whitelist.
        sort_col = params.sort_by if params.sort_by in self.sortable else "id"
        col = getattr(self.model, sort_col)
        stmt = stmt.order_by(desc(col) if params.sort_order == "desc" else asc(col))

        stmt = stmt.limit(params.limit).offset(params.offset)
        items = list(self.db.scalars(stmt).all())
        return items, total
