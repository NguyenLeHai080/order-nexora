"""Router Returns — yêu cầu đổi/trả + duyệt/từ chối/hoàn tất."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import get_context, get_current_user, require
from app.modules.returns import service
from app.modules.returns.models import ReturnRequest
from app.modules.returns.schemas import ReturnCreate, ReturnOut, ReturnRejectBody
from app.modules.users.models import User

router = APIRouter(prefix="/returns", tags=["Sales & Analytics"])


def _out(r: ReturnRequest) -> dict:
    return ReturnOut.model_validate(r).model_dump(mode="json")


def _get(db: Session, return_id: int) -> ReturnRequest:
    obj = db.get(ReturnRequest, return_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy yêu cầu đổi/trả.")
    return obj


@router.get("", summary="Danh sách yêu cầu đổi/trả")
def index(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("returns.index")),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(ReturnRequest)
    if ctx.organization_id is not None:
        stmt = stmt.where(ReturnRequest.organization_id == ctx.organization_id)
    if params.status:
        stmt = stmt.where(ReturnRequest.status == params.status)
    if params.search:
        stmt = stmt.where(ReturnRequest.code.ilike(f"%{params.search}%"))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(ReturnRequest.id.desc()).limit(params.limit).offset(params.offset)
    items = db.scalars(stmt).all()
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/me", summary="Yêu cầu đổi/trả của tôi")
def my_returns(
    params: ListParams = Depends(list_params),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(ReturnRequest).where(ReturnRequest.user_id == user.id)
    if params.status:
        stmt = stmt.where(ReturnRequest.status == params.status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(ReturnRequest.id.desc()).limit(params.limit).offset(params.offset)
    items = db.scalars(stmt).all()
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.post("", status_code=201, summary="Tạo yêu cầu đổi/trả")
def create(
    body: ReturnCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    req = service.create_request(
        db, user.id, body.order_id, body.kind, body.reason, body.exchange_product_id
    )
    return success(_out(req), "Đã gửi yêu cầu đổi/trả.")


@router.get("/{return_id}", summary="Chi tiết yêu cầu đổi/trả")
def show(
    return_id: int,
    user: User = Depends(get_current_user),
    ctx: RequestContext = Depends(get_context),
    db: Session = Depends(get_db),
) -> dict:
    obj = _get(db, return_id)
    if obj.user_id != user.id and not ctx.has_permission("returns.index"):
        raise ForbiddenError("Bạn không có quyền xem yêu cầu này.")
    return {"data": _out(obj), "success": "true"}


@router.post("/{return_id}/approve", summary="Duyệt yêu cầu đổi/trả")
def approve(
    return_id: int,
    _ctx: RequestContext = Depends(require("returns.update")),
    db: Session = Depends(get_db),
) -> dict:
    req = service.approve(db, _get(db, return_id))
    return success(_out(req), "Đã duyệt yêu cầu.")


@router.post("/{return_id}/reject", summary="Từ chối yêu cầu đổi/trả")
def reject(
    return_id: int,
    body: ReturnRejectBody,
    _ctx: RequestContext = Depends(require("returns.update")),
    db: Session = Depends(get_db),
) -> dict:
    req = service.reject(db, _get(db, return_id), body.resolution_note)
    return success(_out(req), "Đã từ chối yêu cầu.")


@router.post("/{return_id}/complete", summary="Hoàn tất yêu cầu đổi/trả")
def complete(
    return_id: int,
    _ctx: RequestContext = Depends(require("returns.update")),
    db: Session = Depends(get_db),
) -> dict:
    req = service.complete(db, _get(db, return_id))
    return success(_out(req), "Đã hoàn tất yêu cầu đổi/trả.")
