"""Router Orders — mua hàng, lịch sử, chi tiết, bảng xếp hạng, báo cáo lợi nhuận."""
from datetime import date, datetime, time

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


@router.get("/profit-summary", summary="Tổng hợp lợi nhuận")
def profit_summary(
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    ctx: RequestContext = Depends(require("orders.index")),
    db: Session = Depends(get_db),
) -> dict:
    """Doanh thu / giá vốn / lợi nhuận / biên LN (chỉ tính đơn success)."""
    stmt = select(
        func.coalesce(func.sum(Order.total_amount), 0),
        func.coalesce(func.sum(Order.total_cost), 0),
        func.count(Order.id),
    ).where(Order.status == "success")
    stmt = _scope_profit(stmt, ctx.organization_id, from_date, to_date)

    revenue, cost, count = db.execute(stmt).one()
    revenue = revenue or 0
    cost = cost or 0
    profit = revenue - cost
    margin = float(profit) / float(revenue) * 100 if revenue else 0.0
    return success(
        {
            "revenue": str(revenue),
            "cost": str(cost),
            "profit": str(profit),
            "margin_percent": round(margin, 2),
            "order_count": count or 0,
        }
    )


@router.get("/profit-by-product", summary="Lợi nhuận theo sản phẩm")
def profit_by_product(
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    ctx: RequestContext = Depends(require("orders.index")),
    db: Session = Depends(get_db),
) -> dict:
    stmt = (
        select(
            Order.product_id,
            func.max(Order.product_name).label("product_name"),
            func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
            func.coalesce(func.sum(Order.total_cost), 0).label("cost"),
            func.count(Order.id).label("order_count"),
        )
        .where(Order.status == "success")
        .group_by(Order.product_id)
        .order_by((func.sum(Order.total_amount) - func.sum(Order.total_cost)).desc())
        .limit(limit)
    )
    stmt = _scope_profit(stmt, ctx.organization_id, from_date, to_date)

    rows = db.execute(stmt).all()
    data = [
        {
            "product_id": r.product_id,
            "product_name": r.product_name or "N/A",
            "revenue": str(r.revenue),
            "cost": str(r.cost),
            "profit": str((r.revenue or 0) - (r.cost or 0)),
            "order_count": r.order_count,
        }
        for r in rows
    ]
    return success(data)


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


@router.post("/{order_id}/cancel", summary="Hủy đơn hàng")
def cancel(
    order_id: int,
    user: User = Depends(get_current_user),
    ctx: RequestContext = Depends(get_context),
    db: Session = Depends(get_db),
) -> dict:
    obj = db.get(Order, order_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy đơn hàng.")
    # Chủ đơn hoặc người có quyền orders.update mới được hủy.
    if obj.user_id != user.id and not ctx.has_permission("orders.update"):
        raise ForbiddenError("Bạn không có quyền hủy đơn hàng này.")
    order = service.cancel_order(db, obj, actor_id=user.id)
    return success(_out(order), "Đã hủy đơn hàng và hoàn tiền vào ví.")


def _paginate_orders(db: Session, params: ListParams, organization_id: int | None):
    stmt = select(Order)
    if organization_id is not None:
        stmt = stmt.where(Order.organization_id == organization_id)
    if params.status:
        stmt = stmt.where(Order.status == params.status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Order.id.desc()).limit(params.limit).offset(params.offset)
    return list(db.scalars(stmt).all()), total


def _scope_profit(stmt, organization_id: int | None, from_date: date | None, to_date: date | None):
    """Thêm điều kiện tổ chức + khoảng ngày cho truy vấn báo cáo lợi nhuận."""
    if organization_id is not None:
        stmt = stmt.where(Order.organization_id == organization_id)
    if from_date:
        stmt = stmt.where(Order.created_at >= datetime.combine(from_date, time.min))
    if to_date:
        stmt = stmt.where(Order.created_at <= datetime.combine(to_date, time.max))
    return stmt
