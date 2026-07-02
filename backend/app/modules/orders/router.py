"""Router Orders — mua hàng, lịch sử, chi tiết, bảng xếp hạng, báo cáo lợi nhuận."""
from datetime import date, datetime, time
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import get_context, get_current_user, require
from app.modules.inventory.models import StockMovement
from app.modules.orders import service
from app.modules.orders.models import Order
from app.modules.orders.schemas import OrderCreate, OrderCustomerOut, OrderFulfill, OrderOut
from app.modules.users.models import User

router = APIRouter(prefix="/orders", tags=["Sales & Analytics"])


def _out(o: Order) -> dict:
    return OrderOut.model_validate(o).model_dump(mode="json")


def _customer_out(o: Order) -> dict:
    """Serialize đơn cho KHÁCH — ẩn giá vốn/lãi/nhà cung cấp/owner."""
    return OrderCustomerOut.model_validate(o).model_dump(mode="json")


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
    """Tổng hợp lợi nhuận: gộp lãi bán hàng (đơn success) + dòng tiền sổ kho.

    Hai góc nhìn, KHÔNG trộn lẫn:
    - Lãi bán hàng (dồn tích): doanh thu − giá vốn của hàng ĐÃ bán (snapshot trên Order).
      Đây là biên lợi nhuận thực của từng đơn, đã trừ voucher (owner_profit).
    - Dòng tiền kho (tiền mặt): mọi THU − CHI trong sổ kho, gồm cả tiền NHẬP HÀNG
      tồn chưa bán (`stock_in_cost`). Phản ánh tiền thực còn lại, kể cả vốn đang
      "đọng" trong kho. `net_cashflow` âm khi vừa nhập nhiều hàng chưa kịp bán.
    """
    stmt = select(
        func.coalesce(func.sum(Order.total_amount), 0),
        func.coalesce(func.sum(Order.total_cost), 0),
        func.coalesce(func.sum(Order.supplier_payable), 0),
        func.coalesce(func.sum(Order.owner_profit), 0),
        func.count(Order.id),
    ).where(Order.status == "success")
    stmt = _scope_profit(stmt, ctx.organization_id, from_date, to_date)

    revenue, cost, supplier_payable, owner_profit, count = db.execute(stmt).one()
    revenue = revenue or 0
    cost = cost or 0
    supplier_payable = supplier_payable or 0
    owner_profit = owner_profit or 0
    profit = revenue - cost
    margin = float(profit) / float(revenue) * 100 if revenue else 0.0

    # Dòng tiền sổ kho: gộp THU/CHI + tách riêng tiền nhập hàng (type="in").
    mv_stmt = select(
        func.coalesce(func.sum(StockMovement.cash_in), 0),
        func.coalesce(func.sum(StockMovement.cash_out), 0),
        func.coalesce(
            func.sum(
                case((StockMovement.type == "in", StockMovement.cash_out), else_=0)
            ),
            0,
        ),
    )
    mv_stmt = _scope_movements(mv_stmt, ctx.organization_id, from_date, to_date)
    ledger_cash_in, ledger_cash_out, stock_in_cost = db.execute(mv_stmt).one()
    ledger_cash_in = ledger_cash_in or Decimal("0")
    ledger_cash_out = ledger_cash_out or Decimal("0")
    stock_in_cost = stock_in_cost or Decimal("0")
    net_cashflow = ledger_cash_in - ledger_cash_out

    owner_user_id = service.resolve_owner_user_id(db, ctx.organization_id, ctx.user_id)
    owner = db.get(User, owner_user_id) if owner_user_id else None
    return success(
        {
            "revenue": str(revenue),
            "cost": str(cost),
            "profit": str(profit),
            "supplier_payable": str(supplier_payable),
            "owner_profit": str(owner_profit),
            "owner_wallet_user_id": owner_user_id,
            "owner_wallet_balance": str(owner.balance) if owner is not None else None,
            "margin_percent": round(margin, 2),
            "order_count": count or 0,
            # Dòng tiền kho (tiền mặt) — gồm cả nhập hàng tồn chưa bán.
            "ledger_cash_in": str(ledger_cash_in),
            "ledger_cash_out": str(ledger_cash_out),
            "stock_in_cost": str(stock_in_cost),
            "net_cashflow": str(net_cashflow),
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


@router.get("/alerts", summary="Cảnh báo đơn cần xử lý (cho thông báo admin real-time)")
def alerts(
    ctx: RequestContext = Depends(require("orders.index")),
    db: Session = Depends(get_db),
) -> dict:
    """Tóm tắt đơn cần chú ý để admin poll định kỳ (thông báo không cần load trang).

    Trả số đơn đang chờ xử lý (`processing`) + chờ thanh toán (`awaiting_payment`),
    id đơn lớn nhất (để FE phát hiện đơn mới), và vài đơn mới nhất cần xử lý.
    """
    base = select(Order)
    if ctx.organization_id is not None:
        base = base.where(Order.organization_id == ctx.organization_id)

    def _count(status: str) -> int:
        stmt = base.where(Order.status == status)
        return db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    processing_count = _count("processing")
    awaiting_count = _count("awaiting_payment")

    # Đơn mới nhất cần xử lý (đã thanh toán, chờ giao) — hiện trong dropdown chuông.
    recent_stmt = base.where(Order.status == "processing").order_by(Order.id.desc()).limit(10)
    recent = list(db.scalars(recent_stmt).all())

    # id lớn nhất trong nhóm cần xử lý — FE so sánh để biết có đơn mới.
    latest_id = recent[0].id if recent else 0

    return success(
        {
            "processing_count": processing_count,
            "awaiting_count": awaiting_count,
            "latest_id": latest_id,
            "recent": [
                {
                    "id": o.id,
                    "code": o.code,
                    "status": o.status,
                    "product_name": o.product_name,
                    "quantity": o.quantity,
                    "total_amount": str(o.total_amount),
                    "guest_name": o.guest_name,
                    "guest_phone": o.guest_phone,
                    "is_guest": o.user_id is None,
                    "created_at": o.created_at.isoformat() if o.created_at else None,
                    "paid_at": o.paid_at.isoformat() if o.paid_at else None,
                }
                for o in recent
            ],
        }
    )


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
    return paginated([_customer_out(i) for i in items], total, params.page, params.limit)


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
    is_staff = ctx.has_permission("orders.index")
    if obj.user_id != user.id and not is_staff:
        raise ForbiddenError("Bạn không có quyền xem đơn hàng này.")
    # Khách (không có orders.index) chỉ nhận dữ liệu an toàn, không lộ giá vốn/lãi.
    data = _out(obj) if is_staff else _customer_out(obj)
    return {"data": data, "success": "true"}


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


@router.post("/{order_id}/mark-paid", summary="[Admin] Xác nhận đơn đã thanh toán (thủ công)")
def mark_paid(
    order_id: int,
    _ctx: RequestContext = Depends(require("orders.update")),
    db: Session = Depends(get_db),
) -> dict:
    obj = db.get(Order, order_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy đơn hàng.")
    if not obj.payment_reference:
        raise ForbiddenError("Đơn này không dùng thanh toán trực tiếp.")
    service.mark_order_paid(db, obj.payment_reference)
    db.refresh(obj)
    return success(_out(obj), "Đã xác nhận thanh toán, đơn chuyển sang xử lý.")


@router.post("/{order_id}/fulfill", summary="[Admin] Duyệt đơn — thành công/thất bại")
def fulfill(
    order_id: int,
    body: OrderFulfill,
    ctx: RequestContext = Depends(require("orders.update")),
    db: Session = Depends(get_db),
) -> dict:
    obj = db.get(Order, order_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy đơn hàng.")
    order = service.fulfill_order_admin(
        db, obj, result=body.result, delivered_content=body.delivered_content,
        note=body.note, actor_id=ctx.user_id,
    )
    return success(_out(order), "Đã cập nhật kết quả đơn hàng.")


@router.post("/{order_id}/retry-provider", summary="[Admin] Lấy hàng từ nhà cung cấp")
def retry_provider(
    order_id: int,
    _ctx: RequestContext = Depends(require("orders.update")),
    db: Session = Depends(get_db),
) -> dict:
    obj = db.get(Order, order_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy đơn hàng.")
    order = service.retry_provider(db, obj)
    return success(_out(order), "Đã gọi nhà cung cấp lấy hàng.")


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


def _scope_movements(stmt, organization_id: int | None, from_date: date | None, to_date: date | None):
    """Như `_scope_profit` nhưng cho truy vấn dòng tiền sổ kho (StockMovement)."""
    if organization_id is not None:
        stmt = stmt.where(StockMovement.organization_id == organization_id)
    if from_date:
        stmt = stmt.where(StockMovement.created_at >= datetime.combine(from_date, time.min))
    if to_date:
        stmt = stmt.where(StockMovement.created_at <= datetime.combine(to_date, time.max))
    return stmt
