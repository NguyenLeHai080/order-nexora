"""Router Engagement (admin) — duyệt/từ chối/trả lời/xóa tương tác landing."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import require
from app.modules.engagement import service
from app.modules.engagement.models import Engagement
from app.modules.engagement.repository import EngagementRepository
from app.modules.engagement.schemas import EngagementAdminOut, ReplyBody

router = APIRouter(prefix="/engagements", tags=["Engagement"])


def _out(e: Engagement) -> dict:
    return EngagementAdminOut.model_validate(e).model_dump(mode="json")


@router.get("", summary="Danh sách tương tác (lọc theo kind/status)")
def index(
    params: ListParams = Depends(list_params),
    kind: str | None = Query(None, description="review | comment | testimonial | discussion"),
    target_type: str | None = Query(None, description="product | article | site"),
    target_id: int | None = Query(None),
    ctx: RequestContext = Depends(require("engagements.index")),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Engagement)
    if ctx.organization_id is not None:
        stmt = stmt.where(Engagement.organization_id == ctx.organization_id)
    if params.search:
        like = f"%{params.search}%"
        stmt = stmt.where(
            (Engagement.content.ilike(like)) | (Engagement.author_name.ilike(like))
        )
    if params.status:
        stmt = stmt.where(Engagement.status == params.status)
    if kind:
        stmt = stmt.where(Engagement.kind == kind)
    if target_type:
        stmt = stmt.where(Engagement.target_type == target_type)
    if target_id is not None:
        stmt = stmt.where(Engagement.target_id == target_id)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    sort_col = params.sort_by if params.sort_by in EngagementRepository.sortable else "id"
    col = getattr(Engagement, sort_col)
    stmt = stmt.order_by(desc(col) if params.sort_order == "desc" else asc(col))
    stmt = stmt.limit(params.limit).offset(params.offset)
    items = list(db.scalars(stmt).all())
    return paginated([_out(e) for e in items], total, params.page, params.limit)


@router.get("/{engagement_id}", summary="Chi tiết tương tác")
def show(
    engagement_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("engagements.show")),
) -> dict:
    e = db.get(Engagement, engagement_id)
    if e is None:
        raise NotFoundError("Không tìm thấy tương tác.")
    return success(_out(e))


@router.patch("/{engagement_id}/approve", summary="Duyệt tương tác")
def approve(
    engagement_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("engagements.update")),
) -> dict:
    e = service.set_status(db, engagement_id, "approved")
    return success(_out(e), message="Đã duyệt.")


@router.patch("/{engagement_id}/reject", summary="Từ chối tương tác")
def reject(
    engagement_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("engagements.update")),
) -> dict:
    e = service.set_status(db, engagement_id, "rejected")
    return success(_out(e), message="Đã từ chối.")


@router.patch("/{engagement_id}/reply", summary="Trả lời / cảm ơn")
def reply(
    engagement_id: int,
    body: ReplyBody,
    ctx: RequestContext = Depends(require("engagements.update")),
    db: Session = Depends(get_db),
) -> dict:
    e = service.set_reply(db, engagement_id, body.admin_reply, ctx.user_id)
    return success(_out(e), message="Đã gửi phản hồi.")


@router.delete("/{engagement_id}", summary="Xóa tương tác")
def destroy(
    engagement_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("engagements.destroy")),
) -> dict:
    e = db.get(Engagement, engagement_id)
    if e is None:
        raise NotFoundError("Không tìm thấy tương tác.")
    db.delete(e)
    db.commit()
    return success(message="Đã xóa tương tác.")
