"""Repository cho LogActivity với bộ lọc đặc thù (method_type, status_code)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.pagination import ListParams
from app.core.repository import BaseRepository
from app.modules.log_activities.models import LogActivity


class LogActivityRepository(BaseRepository[LogActivity]):
    searchable = ["description", "route", "ip_address", "country", "user_type"]
    sortable = [
        "id", "description", "route", "method_type",
        "status_code", "ip_address", "country", "created_at",
    ]

    def __init__(self, db: Session):
        super().__init__(LogActivity, db)

    def _apply_filters(self, stmt, params: ListParams, organization_id: int | None):
        stmt = super()._apply_filters(stmt, params, organization_id)
        # Bộ lọc thêm lấy trực tiếp từ query (không nằm trong ListParams chuẩn).
        return stmt

    def filter_extra(self, stmt, method_type: str | None, status_code: int | None):
        if method_type:
            stmt = stmt.where(LogActivity.method_type == method_type)
        if status_code:
            stmt = stmt.where(LogActivity.status_code == status_code)
        return stmt

    def delete_by_date(self, from_date, to_date) -> int:
        from datetime import datetime, time

        count = (
            self.db.query(LogActivity)
            .filter(
                LogActivity.created_at >= datetime.combine(from_date, time.min),
                LogActivity.created_at <= datetime.combine(to_date, time.max),
            )
            .delete(synchronize_session=False)
        )
        self.db.commit()
        return count

    def clear_all(self) -> int:
        count = self.db.query(LogActivity).delete(synchronize_session=False)
        self.db.commit()
        return count

    def stats(self, params: ListParams) -> int:
        from sqlalchemy import func

        stmt = select(func.count()).select_from(LogActivity)
        stmt = self._apply_filters(select(LogActivity), params, None).subquery()
        return self.db.scalar(select(func.count()).select_from(stmt)) or 0
