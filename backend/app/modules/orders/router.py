"""Router Orders — mua hàng, lịch sử, chi tiết, bảng xếp hạng."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import get_context, get_current_user, require
from app.modules.orders import service
from app.modules.orders.models import Order
from app.modules.orders.schemas import OrderCreate, OrderOut
from app.modules.users.models import User

router = APIRouter(prefix="/orders", tags=["Sales & Analytics"])


def _out(o: Order) -> dict:
    return OrderOut.model_validate(o).model_dump(mode="json")


@router.post("", status_code=201, summary="Mua sản phẩm")
def create(
    body: OrderCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    order = service.purchase(db, user.id, body.product_id, body.quantity, body.voucher_code)
    return success(_out(order), "Mua hàng thành công!")


@router.get("/leaderboard", summary="Bảng xếp hạng chi tiêu")
def leaderboard(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("orders.index")),
) -> dict:
    stmt = (
        select(
            Order.user_id,
            func.coalesce(func.sum(Order.total_amount), 0).label("total_spent"),
            func.count(Order.id).label("order_count"),
        )
        .where(Order.status == "success")
        .group_by(Order.user_id)
        .order_by(func.sum(Order.total_amount).desc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    user_map = {u.id: u.name for u in db.scalars(select(User)).all()}
    data = [
        {
            "user_id": r.user_id,
            "user_name": user_map.get(r.user_id, "N/A"),
            "total_spent": str(r.total_spent),
            "order_count": r.order_count,
        }
        for r in rows
    ]
    return success(data)


@router.get("", summary="Lịch sử đơn hàng")
def index(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("orders.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = _paginate_orders(db, params, ctx.organization_id)
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/me", summary="Đơn hàng của tôi")
def my_orders(
    params: ListParams = Depends(list_params),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Order).where(Order.user_id == user.id)
    if params.status:
        stmt = stmt.where(Order.status == params.status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Order.id.desc()).limit(params.limit).offset(params.offset)
    items = db.scalars(stmt).all()
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/{order_id}", summary="Chi tiết đơn hàng")
def show(
    order_id: int,
    user: User = Depends(get_current_user),
    ctx: RequestContext = Depends(get_context),
    db: Session = Depends(get_db),
) -> dict:
    obj = db.get(Order, order_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy đơn hàng.")
    # Chủ đơn hoặc người có quyền orders.index mới được xem.
    if obj.user_id != user.id and not ctx.has_permission("orders.index"):
        raise ForbiddenError("Bạn không có quyền xem đơn hàng này.")
    return {"data": _out(obj), "success": "true"}


def _paginate_orders(db: Session, params: ListParams, organization_id: int | None):
    stmt = select(Order)
    if organization_id is not None:
        stmt = stmt.where(Order.organization_id == organization_id)
    if params.status:
        stmt = stmt.where(Order.status == params.status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Order.id.desc()).limit(params.limit).offset(params.offset)
    return list(db.scalars(stmt).all()), total
