"""Router Inventory — sổ kho + nhập kho + điều chỉnh tồn + xem tồn hiện tại."""
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import AppException, NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import require
from app.modules.inventory import service
from app.modules.inventory.models import StockMovement
from app.modules.inventory.schemas import AdjustBody, StockInBody, StockMovementOut
from app.modules.products.models import Product
from app.modules.suppliers.models import Supplier

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def _out(m: StockMovement) -> dict:
    return StockMovementOut.model_validate(m).model_dump(mode="json")


def _get_product(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise NotFoundError("Sản phẩm không tồn tại.")
    return product


def _parse_date(value: str) -> datetime:
    """Parse chuỗi ngày ISO (YYYY-MM-DD hoặc full datetime). Lỗi -> 400."""
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        raise AppException(f"Ngày không hợp lệ: {value}") from None


def _require_local_stock(db: Session, product: Product) -> None:
    """Chặn thao tác kho local trên sản phẩm do NCC quản lý tồn."""
    if not service.uses_local_stock(db, product):
        raise AppException(
            "Sản phẩm này do nhà cung cấp quản lý tồn kho, không nhập/điều chỉnh kho local."
        )


def _supplier_names(db: Session, products: list[Product]) -> dict[int, str]:
    """Lookup batch id -> tên NCC (tránh N+1)."""
    ids = {p.supplier_id for p in products if p.supplier_id is not None}
    if not ids:
        return {}
    rows = db.execute(select(Supplier.id, Supplier.name).where(Supplier.id.in_(ids))).all()
    return {row[0]: row[1] for row in rows}


def _stock_row(db: Session, product: Product, supplier_names: dict[int, str]) -> dict:
    """Dựng 1 dòng tồn kho cho sản phẩm (tồn local hoặc tồn NCC tùy loại)."""
    manages_local = service.uses_local_stock(db, product)
    local_qty = product.quantity or 0
    provider_qty = product.provider_quantity
    threshold = product.low_stock_threshold or 0
    effective = local_qty if manages_local else (provider_qty or 0)
    is_low = manages_local and threshold > 0 and 0 < effective <= threshold
    return {
        "product_id": product.id,
        "name": product.name,
        "category_name": product.category_name,
        "supplier_name": supplier_names.get(product.supplier_id) if product.supplier_id else None,
        "manages_local": manages_local,
        "quantity": effective,
        "local_quantity": local_qty,
        "provider_quantity": provider_qty,
        "stock_status": product.stock_status,
        "low_stock_threshold": threshold,
        "is_low": is_low,
    }


@router.get("/stock", summary="Tồn kho hiện tại theo sản phẩm")
def stock(
    params: ListParams = Depends(list_params),
    search: str | None = Query(None, description="Lọc theo tên sản phẩm"),
    state: str | None = Query(None, description="in_stock | out_of_stock | low"),
    ctx: RequestContext = Depends(require("inventory.index")),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Product)
    if ctx.organization_id is not None:
        stmt = stmt.where(Product.organization_id == ctx.organization_id)
    if search:
        stmt = stmt.where(Product.name.ilike(f"%{search}%"))
    products = db.scalars(stmt.order_by(Product.name)).all()

    names = _supplier_names(db, products)
    rows = [_stock_row(db, p, names) for p in products]

    # state="low" và tồn hiệu lực cần tính ở Python -> lọc sau khi dựng row.
    if state == "in_stock":
        rows = [r for r in rows if r["stock_status"] == "in_stock"]
    elif state == "out_of_stock":
        rows = [r for r in rows if r["stock_status"] == "out_of_stock"]
    elif state == "low":
        rows = [r for r in rows if r["is_low"]]

    total = len(rows)
    page_rows = rows[params.offset : params.offset + params.limit]
    return paginated(page_rows, total, params.page, params.limit)


@router.get("/summary", summary="Tổng quan kho")
def summary(
    ctx: RequestContext = Depends(require("inventory.index")),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Product).where(Product.status == "active")
    if ctx.organization_id is not None:
        stmt = stmt.where(Product.organization_id == ctx.organization_id)
    products = db.scalars(stmt).all()

    total = len(products)
    in_stock = sum(1 for p in products if p.stock_status == "in_stock")
    out_of_stock = total - in_stock
    low_stock = sum(1 for p in products if _stock_row(db, p, {})["is_low"])
    return success(
        {"total": total, "in_stock": in_stock, "out_of_stock": out_of_stock, "low_stock": low_stock}
    )


@router.get("/cashflow", summary="Tổng quan thu/chi sổ kho")
def cashflow(
    date_from: str | None = Query(None, description="Lọc từ ngày (ISO: 2026-06-01)"),
    date_to: str | None = Query(None, description="Lọc đến ngày (ISO, bao gồm cả ngày)"),
    ctx: RequestContext = Depends(require("inventory.index")),
    db: Session = Depends(get_db),
) -> dict:
    """Tổng thu/chi/lợi nhuận từ dòng tiền sổ kho (cả SP kho riêng lẫn NCC).

    cash_in = doanh thu bán; cash_out = nhập kho + giá vốn NCC + hoàn tiền.
    profit = cash_in - cash_out. Lọc theo khoảng `created_at` (tùy chọn).
    """
    stmt = select(StockMovement)
    if ctx.organization_id is not None:
        stmt = stmt.where(StockMovement.organization_id == ctx.organization_id)
    if date_from:
        stmt = stmt.where(StockMovement.created_at >= _parse_date(date_from))
    if date_to:
        # bao gồm trọn ngày date_to -> < ngày kế tiếp.
        end = _parse_date(date_to)
        stmt = stmt.where(StockMovement.created_at < end.replace(hour=23, minute=59, second=59))

    rows = db.scalars(stmt).all()
    cash_in = sum((m.cash_in or Decimal("0") for m in rows), Decimal("0"))
    cash_out = sum((m.cash_out or Decimal("0") for m in rows), Decimal("0"))
    stock_in_cost = sum(
        (m.cash_out or Decimal("0") for m in rows if m.type == "in"), Decimal("0")
    )
    revenue = sum(
        (m.cash_in or Decimal("0") for m in rows if m.type == "out"), Decimal("0")
    )
    return success(
        {
            "cash_in": cash_in,
            "cash_out": cash_out,
            "profit": cash_in - cash_out,
            "stock_in_cost": stock_in_cost,
            "revenue": revenue,
            "movement_count": len(rows),
        }
    )


@router.get("/movements", summary="Sổ kho (lịch sử biến động tồn)")
def movements(
    params: ListParams = Depends(list_params),
    product_id: int | None = Query(None, description="Lọc theo sản phẩm"),
    type: str | None = Query(None, description="Lọc theo loại: in|out|adjust|return"),
    ctx: RequestContext = Depends(require("inventory.index")),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(StockMovement)
    if ctx.organization_id is not None:
        stmt = stmt.where(StockMovement.organization_id == ctx.organization_id)
    if product_id is not None:
        stmt = stmt.where(StockMovement.product_id == product_id)
    if type:
        stmt = stmt.where(StockMovement.type == type)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(StockMovement.id.desc()).limit(params.limit).offset(params.offset)
    items = db.scalars(stmt).all()
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/movements/{movement_id}", summary="Chi tiết một biến động kho")
def show(
    movement_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("inventory.show")),
) -> dict:
    obj = db.get(StockMovement, movement_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy biến động kho.")
    return {"data": _out(obj), "success": "true"}


@router.post("/stock-in", status_code=201, summary="Nhập kho")
def stock_in(
    body: StockInBody,
    ctx: RequestContext = Depends(require("inventory.store")),
    db: Session = Depends(get_db),
) -> dict:
    product = _get_product(db, body.product_id)
    _require_local_stock(db, product)
    # Nhập kho = CHI: tiền mua hàng vào kho = số lượng × giá vốn (base_price).
    unit_cost = product.base_price or Decimal("0.00")
    movement = service.apply_movement(
        db,
        product,
        type="in",
        quantity_delta=body.quantity,
        reason=body.reason or "Nhập kho",
        note=body.note,
        ref_type="manual",
        user_id=ctx.user_id,
        unit_cost=unit_cost,
        cash_out=unit_cost * Decimal(body.quantity),
    )
    return success(_out(movement), "Nhập kho thành công!")


@router.post("/adjust", status_code=201, summary="Điều chỉnh tồn kho")
def adjust(
    body: AdjustBody,
    ctx: RequestContext = Depends(require("inventory.update")),
    db: Session = Depends(get_db),
) -> dict:
    product = _get_product(db, body.product_id)
    _require_local_stock(db, product)
    movement = service.apply_movement(
        db,
        product,
        type="adjust",
        quantity_delta=body.quantity_delta,
        reason=body.reason or "Điều chỉnh tồn",
        note=body.note,
        ref_type="manual",
        user_id=ctx.user_id,
    )
    return success(_out(movement), "Điều chỉnh tồn kho thành công!")
