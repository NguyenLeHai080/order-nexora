"""Router LogActivity — list, stats, detail, delete, bulk-delete, clear, delete-by-date.

Theo dự án tham chiếu, các endpoint cần auth + header X-Organization-Id.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import require
from app.modules.log_activities.models import LogActivity
from app.modules.log_activities.repository import LogActivityRepository
from app.modules.log_activities.schemas import BulkIdsRequest, DeleteByDateRequest

router = APIRouter(prefix="/log-activities", tags=["Core - LogActivity"])


@router.get("", summary="Danh sách nhật ký")
def index(
    params: ListParams = Depends(list_params),
    method_type: str | None = Query(None),
    status_code: int | None = Query(None),
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("log-activities.index")),
) -> dict:
    repo = LogActivityRepository(db)
    stmt = repo._apply_filters(select(LogActivity), params, None)
    stmt = repo.filter_extra(stmt, method_type, status_code)
    from sqlalchemy import asc, desc, func

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    col = getattr(LogActivity, params.sort_by if params.sort_by in repo.sortable else "id")
    stmt = stmt.order_by(desc(col) if params.sort_order == "desc" else asc(col))
    stmt = stmt.limit(params.limit).offset(params.offset)
    items = list(db.scalars(stmt).all())
    return paginated([_serialize(i) for i in items], total, params.page, params.limit)


@router.get("/stats", summary="Thống kê nhật ký")
def stats(
    params: ListParams = Depends(list_params),
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("log-activities.index")),
) -> dict:
    repo = LogActivityRepository(db)
    return success({"total": repo.stats(params)})


@router.post("/delete-by-date", summary="Xóa nhật ký theo khoảng thời gian")
def delete_by_date(
    body: DeleteByDateRequest,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("log-activities.destroy")),
) -> dict:
    n = LogActivityRepository(db).delete_by_date(body.from_date, body.to_date)
    return success(message=f"Đã xóa thành công {n} nhật ký trong khoảng thời gian!")


@router.post("/clear", summary="Xóa toàn bộ nhật ký")
def clear(
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("log-activities.destroy")),
) -> dict:
    n = LogActivityRepository(db).clear_all()
    return success(message=f"Đã xóa toàn bộ {n} nhật ký!")


@router.post("/bulk-delete", summary="Xóa hàng loạt nhật ký")
def bulk_delete(
    body: BulkIdsRequest,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("log-activities.destroy")),
) -> dict:
    n = LogActivityRepository(db).bulk_delete(body.ids)
    return success(message=f"Đã xóa thành công {n} nhật ký!")


@router.get("/{log_id}", summary="Chi tiết nhật ký")
def show(
    log_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("log-activities.show")),
) -> dict:
    obj = db.get(LogActivity, log_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy nhật ký.")
    return {"data": _serialize(obj), "success": "true"}


@router.delete("/{log_id}", summary="Xóa nhật ký")
def destroy(
    log_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("log-activities.destroy")),
) -> dict:
    obj = db.get(LogActivity, log_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy nhật ký.")
    db.delete(obj)
    db.commit()
    return success(message="Đã xóa nhật ký thành công!")


def _serialize(o: LogActivity) -> dict:
    return {
        "id": o.id,
        "description": o.description,
        "user_type": o.user_type,
        "user_id": o.user_id,
        "user_name": o.user_name,
        "organization_id": o.organization_id,
        "route": o.route,
        "method_type": o.method_type,
        "status_code": o.status_code,
        "ip_address": o.ip_address,
        "country": o.country,
        "user_agent": o.user_agent,
        "request_data": o.request_data,
        "created_at": o.created_at.strftime("%H:%M:%S %d/%m/%Y") if o.created_at else None,
        "updated_at": o.updated_at.strftime("%H:%M:%S %d/%m/%Y") if o.updated_at else None,
    }
