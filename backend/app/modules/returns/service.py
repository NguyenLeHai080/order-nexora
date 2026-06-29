"""Service Returns — vòng đời yêu cầu đổi/trả.

create (đơn phải success, thuộc khách) -> approve/reject -> complete.
Khi complete, đi qua choke point `inventory.apply_movement` để hồi/xuất kho và
hoàn/điều chỉnh ví trong cùng transaction.
"""
from __future__ import annotations

import secrets
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundError
from app.modules.inventory.service import apply_movement, uses_local_stock
from app.modules.invoices import service as invoice_service
from app.modules.orders import service as order_service
from app.modules.orders.models import Order
from app.modules.products.models import Product
from app.modules.returns.models import ReturnRequest
from app.modules.users.models import User
from app.modules.warranties import service as warranty_service


def _gen_code() -> str:
    return f"RT-{secrets.token_hex(4).upper()}"


def create_request(
    db: Session,
    user_id: int,
    order_id: int,
    kind: str,
    reason: str | None,
    exchange_product_id: int | None,
) -> ReturnRequest:
    order = db.get(Order, order_id)
    if order is None:
        raise NotFoundError("Đơn hàng không tồn tại.")
    if order.user_id != user_id:
        raise AppException("Đơn hàng không thuộc về bạn.")
    if order.status != "success":
        raise AppException("Chỉ đơn đã hoàn tất mới yêu cầu đổi/trả được.")
    if kind == "exchange":
        if exchange_product_id is None:
            raise AppException("Đổi hàng cần chọn sản phẩm thay thế.")
        if db.get(Product, exchange_product_id) is None:
            raise NotFoundError("Sản phẩm thay thế không tồn tại.")

    req = ReturnRequest(
        code=_gen_code(),
        order_id=order.id,
        user_id=user_id,
        kind=kind,
        reason=reason,
        status="requested",
        exchange_product_id=exchange_product_id if kind == "exchange" else None,
        organization_id=order.organization_id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def approve(db: Session, req: ReturnRequest) -> ReturnRequest:
    if req.status != "requested":
        raise AppException("Chỉ yêu cầu đang chờ mới duyệt được.")
    req.status = "approved"
    db.commit()
    db.refresh(req)
    return req


def reject(db: Session, req: ReturnRequest, note: str | None) -> ReturnRequest:
    if req.status != "requested":
        raise AppException("Chỉ yêu cầu đang chờ mới từ chối được.")
    req.status = "rejected"
    req.resolution_note = note
    db.commit()
    db.refresh(req)
    return req


def complete(db: Session, req: ReturnRequest) -> ReturnRequest:
    if req.status != "approved":
        raise AppException("Chỉ yêu cầu đã duyệt mới hoàn tất được.")
    order = db.get(Order, req.order_id) if req.order_id else None
    if order is None:
        raise NotFoundError("Đơn hàng gốc không còn tồn tại.")
    user = db.get(User, order.user_id) if order.user_id else None
    original = db.get(Product, order.product_id) if order.product_id else None
    qty = order.quantity or 0

    if req.kind == "return":
        _complete_return(db, req, order, user, original, qty)
    else:
        _complete_exchange(db, req, order, user, original, qty)

    req.status = "completed"
    db.commit()
    db.refresh(req)
    return req


def _complete_return(
    db: Session,
    req: ReturnRequest,
    order: Order,
    user: User | None,
    original: Product | None,
    qty: int,
) -> None:
    """Trả hàng: hoàn toàn bộ tiền + hồi kho sản phẩm gốc + đơn -> cancelled."""
    refund = order.total_amount or Decimal("0")
    if user is not None:
        user.balance = (user.balance or Decimal("0")) + refund
    order_service.reverse_owner_profit(db, order)
    req.refund_amount = refund

    if original is not None:
        if uses_local_stock(db, original):
            # Hồi kho + CHI = hoàn tiền khách (đảo doanh thu bán).
            apply_movement(
                db, original, type="return", quantity_delta=qty,
                reason="Trả hàng — hồi kho", ref_type="return", ref_id=req.id,
                user_id=req.user_id, cash_out=refund, commit=False,
            )
        else:
            # NCC: ledger dòng tiền-thuần — CHI hoàn khách, THU hoàn vốn từ NCC.
            apply_movement(
                db, original, type="return", quantity_delta=0,
                reason="Trả hàng (NCC) — hoàn tiền", ref_type="return", ref_id=req.id,
                user_id=req.user_id, cash_out=refund, cash_in=order.total_cost or Decimal("0"),
                tracks_stock=False, commit=False,
            )

    order.status = "cancelled"
    order.note = "Đơn đã trả hàng."
    invoice_service.mark_refunded_for_order(db, order.id, commit=False)
    warranty_service.void_for_order(db, order.id, commit=False)


def _complete_exchange(
    db: Session,
    req: ReturnRequest,
    order: Order,
    user: User | None,
    original: Product | None,
    qty: int,
) -> None:
    """Đổi hàng: xuất kho SP mới + hồi kho SP gốc + cộng/trừ ví theo chênh giá.

    Dòng tiền (cả SP kho riêng lẫn NCC): đảo doanh thu/giá vốn đơn cũ trên SP gốc,
    ghi doanh thu/giá vốn đơn mới trên SP thay thế. Net cashflow = chênh lệch đúng.
    """
    new_product = db.get(Product, req.exchange_product_id) if req.exchange_product_id else None
    if new_product is None:
        raise NotFoundError("Sản phẩm thay thế không tồn tại.")
    if new_product.status != "active":
        raise AppException("Sản phẩm thay thế đã ngừng bán.")

    # Snapshot giá trị đơn CŨ trước khi ghi đè (để đảo dòng tiền cho đúng).
    old_unit = order.unit_price or Decimal("0")
    old_revenue = order.total_amount or Decimal("0")
    old_cost = order.total_cost or Decimal("0")
    new_unit = new_product.sale_price
    new_revenue = new_unit * Decimal(qty)
    new_cost = (new_product.base_price or Decimal("0")) * Decimal(qty)
    new_owner_profit = new_revenue - new_cost

    # Xuất kho / ghi doanh thu sản phẩm MỚI.
    if uses_local_stock(db, new_product):
        if (new_product.quantity or 0) < qty:
            raise AppException(
                f"Tồn kho sản phẩm thay thế không đủ: còn {new_product.quantity or 0}, cần {qty}."
            )
        apply_movement(
            db, new_product, type="out", quantity_delta=-qty,
            reason="Đổi hàng — xuất sản phẩm mới", ref_type="return", ref_id=req.id,
            user_id=req.user_id, unit_price=new_unit, cash_in=new_revenue, commit=False,
        )
    else:
        apply_movement(
            db, new_product, type="out", quantity_delta=0,
            reason="Đổi hàng (NCC) — bán sản phẩm mới", ref_type="return", ref_id=req.id,
            user_id=req.user_id, unit_cost=new_product.base_price, unit_price=new_unit,
            cash_in=new_revenue, cash_out=new_cost, tracks_stock=False, commit=False,
        )

    # Hồi kho / đảo doanh thu sản phẩm GỐC.
    if original is not None:
        if uses_local_stock(db, original):
            apply_movement(
                db, original, type="return", quantity_delta=qty,
                reason="Đổi hàng — hồi kho sản phẩm gốc", ref_type="return", ref_id=req.id,
                user_id=req.user_id, unit_price=old_unit, cash_out=old_revenue, commit=False,
            )
        else:
            apply_movement(
                db, original, type="return", quantity_delta=0,
                reason="Đổi hàng (NCC) — đảo đơn gốc", ref_type="return", ref_id=req.id,
                user_id=req.user_id, cash_out=old_revenue, cash_in=old_cost,
                tracks_stock=False, commit=False,
            )

    # Chênh giá = giá mới - giá cũ (theo số lượng). >0: thu thêm; <0: hoàn lại.
    delta = (new_unit - old_unit) * Decimal(qty)
    if user is not None and delta != 0:
        # delta>0 khách trả thêm (trừ ví); delta<0 hoàn lại (cộng ví).
        user.balance = (user.balance or Decimal("0")) - delta
    req.refund_amount = -delta if delta < 0 else Decimal("0")
    req.resolution_note = (
        f"Đổi sang '{new_product.name}'. Chênh lệch: {delta} (âm = hoàn cho khách)."
    )

    # Cập nhật snapshot đơn sang sản phẩm mới.
    order.product_id = new_product.id
    order.product_name = new_product.name
    order.unit_price = new_unit
    order.total_amount = (order.total_amount or Decimal("0")) + delta
    order.unit_cost = new_product.base_price or Decimal("0")
    order.total_cost = new_cost
    order.supplier_id = new_product.supplier_id
    order.supplier_payable = new_cost if new_product.supplier_id else Decimal("0")
    order.fulfillment_type = new_product.delivery_type or (
        "local_stock" if uses_local_stock(db, new_product) else "provider"
    )
    order.manual_fulfillment_required = new_product.delivery_type == "MANUAL"
    order_service.apply_owner_profit_delta(db, order, new_owner_profit)
    order.note = "Đơn đã đổi sản phẩm."
