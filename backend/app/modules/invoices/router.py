"""Router Invoices — danh sách + chi tiết hóa đơn (để in)."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated
from app.modules.auth.dependencies import get_context, get_current_user, require
from app.modules.invoices.models import Invoice
from app.modules.invoices.schemas import InvoiceOut
from app.modules.users.models import User

router = APIRouter(prefix="/invoices", tags=["Sales & Analytics"])


def _out(inv: Invoice) -> dict:
    return InvoiceOut.model_validate(inv).model_dump(mode="json")


@router.get("", summary="Danh sách hóa đơn")
def index(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("invoices.index")),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Invoice)
    if ctx.organization_id is not None:
        stmt = stmt.where(Invoice.organization_id == ctx.organization_id)
    if params.status:
        stmt = stmt.where(Invoice.status == params.status)
    if params.search:
        like = f"%{params.search}%"
        stmt = stmt.where(
            Invoice.code.ilike(like)
            | Invoice.customer_name.ilike(like)
            | Invoice.product_name.ilike(like)
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Invoice.id.desc()).limit(params.limit).offset(params.offset)
    items = db.scalars(stmt).all()
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/me", summary="Hóa đơn của tôi")
def my_invoices(
    params: ListParams = Depends(list_params),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Invoice).where(Invoice.user_id == user.id)
    if params.status:
        stmt = stmt.where(Invoice.status == params.status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Invoice.id.desc()).limit(params.limit).offset(params.offset)
    items = db.scalars(stmt).all()
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/{invoice_id}", summary="Chi tiết hóa đơn")
def show(
    invoice_id: int,
    user: User = Depends(get_current_user),
    ctx: RequestContext = Depends(get_context),
    db: Session = Depends(get_db),
) -> dict:
    obj = db.get(Invoice, invoice_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy hóa đơn.")
    # Chủ hóa đơn hoặc người có quyền invoices.index mới được xem.
    if obj.user_id != user.id and not ctx.has_permission("invoices.index"):
        raise ForbiddenError("Bạn không có quyền xem hóa đơn này.")
    return {"data": _out(obj), "success": "true"}
