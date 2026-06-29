"""Router Warranties — danh sách + chi tiết + ghi nhận bảo hành (claim) + void."""
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import AppException, ForbiddenError, NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import get_context, get_current_user, require
from app.modules.users.models import User
from app.modules.warranties.models import Warranty
from app.modules.warranties.schemas import WarrantyClaimBody, WarrantyOut

router = APIRouter(prefix="/warranties", tags=["Sales & Analytics"])


def _out(w: Warranty) -> dict:
    return WarrantyOut.model_validate(w).model_dump(mode="json")


@router.get("", summary="Danh sách bảo hành")
def index(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("warranties.index")),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Warranty)
    if ctx.organization_id is not None:
        stmt = stmt.where(Warranty.organization_id == ctx.organization_id)
    if params.status:
        stmt = stmt.where(Warranty.status == params.status)
    if params.search:
        like = f"%{params.search}%"
        stmt = stmt.where(Warranty.code.ilike(like) | Warranty.product_name.ilike(like))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Warranty.id.desc()).limit(params.limit).offset(params.offset)
    items = db.scalars(stmt).all()
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/me", summary="Bảo hành của tôi")
def my_warranties(
    params: ListParams = Depends(list_params),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Warranty).where(Warranty.user_id == user.id)
    if params.status:
        stmt = stmt.where(Warranty.status == params.status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Warranty.id.desc()).limit(params.limit).offset(params.offset)
    items = db.scalars(stmt).all()
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/{warranty_id}", summary="Chi tiết bảo hành")
def show(
    warranty_id: int,
    user: User = Depends(get_current_user),
    ctx: RequestContext = Depends(get_context),
    db: Session = Depends(get_db),
) -> dict:
    obj = db.get(Warranty, warranty_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy phiếu bảo hành.")
    if obj.user_id != user.id and not ctx.has_permission("warranties.index"):
        raise ForbiddenError("Bạn không có quyền xem phiếu bảo hành này.")
    return {"data": _out(obj), "success": "true"}


@router.post("/{warranty_id}/claim", summary="Ghi nhận yêu cầu bảo hành")
def claim(
    warranty_id: int,
    body: WarrantyClaimBody,
    _ctx: RequestContext = Depends(require("warranties.update")),
    db: Session = Depends(get_db),
) -> dict:
    obj = db.get(Warranty, warranty_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy phiếu bảo hành.")
    if obj.status != "active":
        raise AppException("Chỉ phiếu đang hiệu lực mới ghi nhận bảo hành được.")
    # SQLite trả datetime naive — coi như UTC để so sánh an toàn.
    ends_at = obj.ends_at
    if ends_at is not None and ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=UTC)
    if ends_at is not None and ends_at < datetime.now(UTC):
        obj.status = "expired"
        db.commit()
        raise AppException("Phiếu bảo hành đã hết hạn.")
    obj.status = "claimed"
    obj.claim_note = body.claim_note
    db.commit()
    db.refresh(obj)
    return success(_out(obj), "Đã ghi nhận yêu cầu bảo hành.")


@router.post("/{warranty_id}/void", summary="Hủy hiệu lực phiếu bảo hành")
def void(
    warranty_id: int,
    _ctx: RequestContext = Depends(require("warranties.update")),
    db: Session = Depends(get_db),
) -> dict:
    obj = db.get(Warranty, warranty_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy phiếu bảo hành.")
    obj.status = "void"
    db.commit()
    db.refresh(obj)
    return success(_out(obj), "Đã hủy hiệu lực phiếu bảo hành.")
