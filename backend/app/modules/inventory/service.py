"""Service Inventory — choke point quản lý tồn kho local + sổ kho.

`apply_movement` là CHỖ DUY NHẤT được phép đổi `Product.quantity`. Mọi luồng
(nhập kho, bán hàng, hủy đơn, đổi/trả) đều gọi qua đây để đảm bảo luôn có một
dòng sổ kho tương ứng và số dư (balance_after) khớp.

`uses_local_stock` phân biệt sản phẩm tự quản kho (đếm số lượng) với sản phẩm
do NCC tạo đơn (tồn nằm bên NCC, ta giữ stock_status từ catalog sync).
"""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.modules.inventory.models import StockMovement
from app.modules.products.models import Product
from app.modules.suppliers.models import Supplier


def uses_local_stock(db: Session, product: Product) -> bool:
    """True nếu sản phẩm tự quản tồn kho local.

    - Không gắn NCC -> tự quản kho.
    - Gắn NCC nhưng driver KHÔNG có capability "orders" (vd cazyserver) -> tự quản.
    - Gắn NCC có capability "orders" (vd vdstore) -> tồn nằm bên NCC, KHÔNG dùng local.
    """
    from app.integrations import registry

    if product.supplier_id is None:
        return True
    supplier = db.get(Supplier, product.supplier_id)
    if supplier is None:
        return True
    return not registry.has_capability(supplier.driver, "orders")


def apply_movement(
    db: Session,
    product: Product,
    *,
    type: str,
    quantity_delta: int,
    reason: str | None = None,
    note: str | None = None,
    ref_type: str | None = None,
    ref_id: int | None = None,
    user_id: int | None = None,
    unit_cost: Decimal | None = None,
    unit_price: Decimal | None = None,
    cash_in: Decimal | None = None,
    cash_out: Decimal | None = None,
    tracks_stock: bool = True,
    commit: bool = True,
) -> StockMovement:
    """Ghi một biến động kho + (tùy chọn) cập nhật Product.quantity & dòng tiền.

    Raise nếu tồn sau biến động < 0. Với sản phẩm local-stock, đồng bộ luôn
    stock_status theo tồn mới. `commit=False` để gộp vào transaction lớn hơn
    (vd purchase/cancel) — caller tự commit.

    `tracks_stock=False`: dòng tiền-thuần (đơn NCC) — KHÔNG đổi tồn local, chỉ
    ghi sổ thu/chi. `cash_in`/`cash_out` do caller tính sẵn (nơi biết ngữ cảnh
    nhập hàng / bán hàng / hoàn tiền). `unit_cost`/`unit_price` lưu để hiển thị.
    """
    current = product.quantity or 0
    if tracks_stock:
        new_qty = current + quantity_delta
        if new_qty < 0:
            raise AppException(
                f"Tồn kho không đủ: hiện {current}, cần giảm {abs(quantity_delta)}."
            )
        product.quantity = new_qty
        # Chỉ maintain stock_status cho sản phẩm tự quản kho.
        if uses_local_stock(db, product):
            product.stock_status = "in_stock" if new_qty > 0 else "out_of_stock"
    else:
        new_qty = current  # dòng tiền-thuần, tồn local không đổi

    movement = StockMovement(
        product_id=product.id,
        product_name=product.name,
        type=type,
        quantity_delta=quantity_delta,
        balance_after=new_qty,
        tracks_stock=tracks_stock,
        unit_cost=unit_cost,
        unit_price=unit_price,
        cash_in=cash_in or Decimal("0.00"),
        cash_out=cash_out or Decimal("0.00"),
        reason=reason,
        note=note,
        ref_type=ref_type,
        ref_id=ref_id,
        user_id=user_id,
        organization_id=product.organization_id,
    )
    db.add(movement)
    if commit:
        db.commit()
        db.refresh(movement)
    return movement


def has_movement(db: Session, *, ref_type: str, ref_id: int, type: str) -> bool:
    """Đã tồn tại biến động (ref_type, ref_id, type) chưa — dùng để idempotent."""
    stmt = select(StockMovement.id).where(
        StockMovement.ref_type == ref_type,
        StockMovement.ref_id == ref_id,
        StockMovement.type == type,
    )
    return db.scalar(stmt) is not None
