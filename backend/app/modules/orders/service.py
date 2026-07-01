"""Service Orders — luồng mua sản phẩm số.

Luồng: kiểm tra sản phẩm/kho -> tính giá (áp voucher) -> trừ ví -> gọi API
nhà cung cấp lấy hàng real-time -> giao hàng -> ghi nhận. Nếu lấy hàng thất bại
thì hoàn tiền (rollback) và đánh dấu đơn failed.

Việc gọi nhà cung cấp thật được ủy thác cho `app.modules.partner.service`
(qua lớp adapter). Order service không biết shape JSON của NCC — chỉ nhận
FulfillmentResult với status success|processing|failed.
"""
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundError
from app.modules.inventory.service import apply_movement, has_movement, uses_local_stock
from app.modules.invoices import service as invoice_service
from app.modules.notifications import service as notification_service
from app.modules.orders.models import Order
from app.modules.partner import service as partner_service
from app.modules.permissions.models import Role
from app.modules.products.models import Product
from app.modules.settings import service as settings_service
from app.modules.suppliers.models import Supplier
from app.modules.users.models import User, UserRole
from app.modules.vouchers.service import apply_voucher
from app.modules.warranties import service as warranty_service


def _gen_code() -> str:
    return f"OD-{secrets.token_hex(4).upper()}"


def _gen_guest_reference() -> str:
    """Mã định danh chuyển khoản dùng chung cho một lần guest checkout."""
    return f"OD-GUEST-{secrets.token_hex(4).upper()}"


@dataclass
class _Delivery:
    status: str  # success | processing | failed
    content: str | None = None
    note: str | None = None


def _fetch_from_supplier(db: Session, order: Order, product: Product) -> _Delivery:
    """Lấy hàng từ nhà cung cấp tương ứng driver của supplier.

    - driver hỗ trợ capability "orders" (vd vdstore): gọi API thật qua partner.service.
    - không có supplier API (manual/None/driver không tạo đơn): giữ nội dung giả lập.
    """
    from app.integrations import registry

    supplier = db.get(Supplier, product.supplier_id) if product.supplier_id else None

    if product.delivery_type == "MANUAL":
        cfg = settings_service.get_manual_fulfillment_config(db)
        return _Delivery(
            status="processing",
            note=cfg["instructions"] or "Don can nhan vien xu ly thu cong.",
        )

    if supplier is not None and registry.has_capability(supplier.driver, "orders"):
        result = partner_service.fulfill_via_provider(db, order, product, supplier)
        return _Delivery(status=result.status, content=result.delivered_content, note=result.note)

    # Fallback nhà cung cấp thủ công / chưa cấu hình API: mô phỏng như cũ.
    if product.stock_status == "out_of_stock":
        return _Delivery(status="failed", note="Sản phẩm đã hết hàng.")
    content = f"[DELIVERED] {product.name} - mã: {secrets.token_hex(6).upper()}"
    return _Delivery(status="success", content=content)


def resolve_owner_user_id(db: Session, organization_id: int | None, fallback_user_id: int) -> int:
    raw = settings_service.get_value(db, settings_service.OWNER_WALLET_USER_ID_KEY)
    if raw:
        try:
            return int(raw)
        except ValueError:
            pass

    stmt = (
        select(User.id)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .where(Role.name == "admin", User.status == "active")
        .order_by(User.id.asc())
    )
    if organization_id is not None:
        stmt = stmt.where(UserRole.organization_id == organization_id)
    owner_id = db.scalar(stmt)
    return int(owner_id or fallback_user_id)


def credit_owner_profit(db: Session, order: Order) -> None:
    if not order.owner_user_id:
        return
    owner = db.get(User, order.owner_user_id)
    if owner is None:
        return
    owner.balance = (owner.balance or Decimal("0")) + (order.owner_profit or Decimal("0"))


def reverse_owner_profit(db: Session, order: Order) -> None:
    if not order.owner_user_id:
        return
    owner = db.get(User, order.owner_user_id)
    if owner is None:
        return
    owner.balance = (owner.balance or Decimal("0")) - (order.owner_profit or Decimal("0"))


def apply_owner_profit_delta(db: Session, order: Order, new_owner_profit: Decimal) -> None:
    old_owner_profit = order.owner_profit or Decimal("0")
    delta = new_owner_profit - old_owner_profit
    if not order.owner_user_id:
        order.owner_user_id = resolve_owner_user_id(db, order.organization_id, order.user_id)
    owner = db.get(User, order.owner_user_id) if order.owner_user_id else None
    if owner is not None and delta:
        owner.balance = (owner.balance or Decimal("0")) + delta
    order.owner_profit = new_owner_profit


def purchase(db: Session, user_id: int, product_id: int, quantity: int, voucher_code: str | None) -> Order:
    product = db.get(Product, product_id)
    if product is None or product.status != "active":
        raise NotFoundError("Sản phẩm không tồn tại hoặc đã ngừng bán.")
    if product.stock_status == "out_of_stock":
        raise AppException("Sản phẩm đã hết hàng.")

    # Sản phẩm tự quản kho: chặn nếu tồn không đủ (sản phẩm NCC tồn nằm bên NCC).
    local_stock = uses_local_stock(db, product)
    if local_stock and (product.quantity or 0) < quantity:
        raise AppException(f"Tồn kho không đủ: còn {product.quantity or 0}, cần {quantity}.")

    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("Người dùng không tồn tại.")

    unit_price = product.sale_price
    total = unit_price * Decimal(quantity)
    # Giá vốn (giá nhà cung cấp) — snapshot để tính lợi nhuận về sau.
    unit_cost = product.base_price or Decimal("0")
    total_cost = unit_cost * Decimal(quantity)
    supplier_payable = total_cost if product.supplier_id else Decimal("0")

    # Áp voucher (nếu có) — giảm trên tổng tiền.
    if voucher_code:
        total = apply_voucher(db, voucher_code, total)

    if (user.balance or Decimal("0")) < total:
        raise AppException("Số dư không đủ. Vui lòng nạp thêm tiền.")

    # Trừ tiền trước, tạo đơn ở trạng thái processing.
    user.balance = user.balance - total
    order = Order(
        code=_gen_code(),
        user_id=user_id,
        product_id=product.id,
        product_name=product.name,
        unit_price=unit_price,
        quantity=quantity,
        total_amount=total,
        unit_cost=unit_cost,
        total_cost=total_cost,
        supplier_id=product.supplier_id,
        supplier_payable=supplier_payable,
        owner_user_id=resolve_owner_user_id(db, product.organization_id, user_id),
        owner_profit=total - total_cost,
        fulfillment_type=product.delivery_type or ("local_stock" if local_stock else "provider"),
        status="processing",
        organization_id=product.organization_id,
    )
    if product.delivery_type == "MANUAL":
        cfg = settings_service.get_manual_fulfillment_config(db)
        order.manual_fulfillment_required = True
        order.manual_contact_name = cfg["name"]
        order.manual_contact_url = cfg["zalo_url"]
        order.manual_qr_image_url = cfg["qr_url"]
    db.add(order)
    db.commit()
    db.refresh(order)

    # Gọi nhà cung cấp lấy hàng.
    delivery = _fetch_from_supplier(db, order, product)

    if delivery.status == "failed":
        # Hoàn tiền + đánh dấu thất bại.
        user.balance = user.balance + total
        order.status = "failed"
        order.note = delivery.note or "Nhà cung cấp hết hàng hoặc lỗi khi lấy hàng."
        db.commit()
        raise AppException("Lấy hàng thất bại, đã hoàn tiền vào ví.")

    if delivery.status == "processing":
        # Đơn còn chờ admin NCC xử lý thủ công — giữ tiền, chờ webhook/poll cập nhật.
        order.status = "processing"
        order.note = "Đơn đang chờ nhà cung cấp xử lý."
        if order.manual_fulfillment_required:
            order.note = delivery.note or "Don dang cho nhan vien xu ly thu cong."
        product.sold_count = (product.sold_count or 0) + quantity
        _record_sale_ledger(db, order, product, local_stock=local_stock,
                            reason="Bán hàng (chờ xử lý)")
        credit_owner_profit(db, order)
        db.commit()
        db.refresh(order)
        return order

    # success — đã có nội dung giao.
    order.delivered_content = delivery.content
    order.status = "success"
    product.sold_count = (product.sold_count or 0) + quantity
    _record_sale_ledger(db, order, product, local_stock=local_stock, reason="Bán hàng")
    credit_owner_profit(db, order)
    # Phát hành hóa đơn + phiếu bảo hành (nếu có) trong cùng transaction.
    invoice_service.issue_for_order(db, order, product, user, commit=False)
    warranty_service.create_for_order(db, order, product, commit=False)
    db.commit()
    db.refresh(order)
    return order


def _record_sale_ledger(db: Session, order, product: Product, *, local_stock: bool, reason: str) -> None:
    """Ghi sổ kho + dòng tiền cho một đơn bán (cả sản phẩm kho riêng lẫn NCC).

    - Kho riêng: trừ kho local; THU = doanh thu (giá vốn đã tính lúc NHẬP kho).
    - NCC: tồn nằm bên họ -> ledger dòng tiền-thuần (tracks_stock=False); THU =
      doanh thu, CHI = giá vốn (VD trừ ví CTV ngay lúc bán). Lợi nhuận = THU - CHI.
    """
    qty = order.quantity or 0
    revenue = order.total_amount or Decimal("0")
    if local_stock:
        apply_movement(
            db, product, type="out", quantity_delta=-qty,
            reason=reason, ref_type="order", ref_id=order.id,
            user_id=order.user_id,
            unit_price=order.unit_price,
            cash_in=revenue,
            commit=False,
        )
    else:
        apply_movement(
            db, product, type="out", quantity_delta=-qty,
            reason=f"{reason} (NCC)", ref_type="order", ref_id=order.id,
            user_id=order.user_id,
            unit_cost=order.unit_cost, unit_price=order.unit_price,
            cash_in=revenue, cash_out=order.total_cost or Decimal("0"),
            tracks_stock=False,
            commit=False,
        )


def cancel_order(db: Session, order: Order, actor_id: int) -> Order:
    """Hủy đơn: hoàn ví + hồi kho (nếu local) + void hóa đơn/bảo hành.

    Chỉ đơn processing/success mới hủy được. Idempotent ở phần hồi kho: chỉ
    hoàn nếu đơn từng trừ kho (`out`) và chưa hoàn (`return`). Sản phẩm NCC
    (không local-stock) không trừ kho local nên cũng không cần hồi.
    """
    if order.status not in {"processing", "success"}:
        raise AppException("Chỉ đơn đang xử lý hoặc đã hoàn tất mới có thể hủy.")

    # Hoàn tiền vào ví khách.
    user = db.get(User, order.user_id)
    if user is not None:
        user.balance = (user.balance or Decimal("0")) + (order.total_amount or Decimal("0"))
    reverse_owner_profit(db, order)

    # Hồi kho + đảo dòng tiền nếu đơn đã ghi sổ bán (`out`) và chưa hoàn (`return`).
    product = db.get(Product, order.product_id) if order.product_id else None
    already_sold = product is not None and has_movement(
        db, ref_type="order", ref_id=order.id, type="out"
    )
    already_returned = has_movement(db, ref_type="order", ref_id=order.id, type="return")
    if product is not None and already_sold and not already_returned:
        refund = order.total_amount or Decimal("0")
        if uses_local_stock(db, product):
            # Hồi kho + CHI = hoàn tiền khách (doanh thu bán bị đảo lại).
            apply_movement(
                db, product, type="return", quantity_delta=order.quantity or 0,
                reason="Hủy đơn — hồi kho", ref_type="order", ref_id=order.id,
                user_id=actor_id, cash_out=refund, commit=False,
            )
        else:
            # NCC: ledger dòng tiền-thuần đảo ngược — CHI hoàn khách, THU hoàn vốn từ NCC.
            apply_movement(
                db, product, type="return", quantity_delta=0,
                reason="Hủy đơn (NCC) — hoàn tiền", ref_type="order", ref_id=order.id,
                user_id=actor_id, cash_out=refund, cash_in=order.total_cost or Decimal("0"),
                tracks_stock=False, commit=False,
            )

    order.status = "cancelled"
    order.note = "Đơn đã bị hủy."
    invoice_service.mark_refunded_for_order(db, order.id, commit=False)
    warranty_service.void_for_order(db, order.id, commit=False)
    db.commit()
    db.refresh(order)
    return order


# ─── Guest checkout (mua không cần đăng nhập, trả QR trực tiếp — KHÔNG qua ví) ──


def create_guest_orders(db: Session, items: list[dict], contact: dict) -> dict:
    """Tạo (các) đơn khách vãng lai ở trạng thái awaiting_payment, chưa thu tiền.

    items: [{"product_id": int, "quantity": int}, ...]
    contact: {"name": str, "phone": str|None, "email": str|None}
    Trả {reference, lookup_token, total, orders:[Order]}. Chưa gọi NCC, chưa ghi
    sổ, chưa cộng lãi owner — tất cả dồn về `mark_order_paid` khi tiền vào.
    """
    if not items:
        raise AppException("Giỏ hàng trống.")

    reference = _gen_guest_reference()
    lookup_token = secrets.token_urlsafe(24)
    orders: list[Order] = []
    total = Decimal("0")

    for item in items:
        product = db.get(Product, item["product_id"])
        quantity = int(item.get("quantity", 1) or 1)
        if product is None or product.status != "active":
            raise NotFoundError("Sản phẩm không tồn tại hoặc đã ngừng bán.")
        if product.stock_status == "out_of_stock":
            raise AppException(f"Sản phẩm '{product.name}' đã hết hàng.")
        local_stock = uses_local_stock(db, product)
        if local_stock and (product.quantity or 0) < quantity:
            raise AppException(
                f"Tồn kho không đủ cho '{product.name}': còn {product.quantity or 0}, cần {quantity}."
            )

        unit_price = product.sale_price
        line_total = unit_price * Decimal(quantity)
        unit_cost = product.base_price or Decimal("0")
        total_cost = unit_cost * Decimal(quantity)
        supplier_payable = total_cost if product.supplier_id else Decimal("0")

        order = Order(
            code=_gen_code(),
            user_id=None,
            guest_name=contact.get("name"),
            guest_phone=contact.get("phone"),
            guest_email=contact.get("email"),
            product_id=product.id,
            product_name=product.name,
            unit_price=unit_price,
            quantity=quantity,
            total_amount=line_total,
            unit_cost=unit_cost,
            total_cost=total_cost,
            supplier_id=product.supplier_id,
            supplier_payable=supplier_payable,
            owner_user_id=resolve_owner_user_id(db, product.organization_id, 0) or None,
            owner_profit=line_total - total_cost,
            fulfillment_type=product.delivery_type or ("local_stock" if local_stock else "provider"),
            status="awaiting_payment",
            payment_status="unpaid",
            payment_reference=reference,
            lookup_token=lookup_token,
            organization_id=product.organization_id,
        )
        if product.delivery_type == "MANUAL":
            cfg = settings_service.get_manual_fulfillment_config(db)
            order.manual_fulfillment_required = True
            order.manual_contact_name = cfg["name"]
            order.manual_contact_url = cfg["zalo_url"]
            order.manual_qr_image_url = cfg["qr_url"]
        db.add(order)
        orders.append(order)
        total += line_total

    db.commit()
    for order in orders:
        db.refresh(order)
    return {
        "reference": reference,
        "lookup_token": lookup_token,
        "total": total,
        "orders": orders,
    }


def mark_order_paid(db: Session, reference: str) -> list[Order]:
    """Đánh dấu (các) đơn cùng payment_reference đã thanh toán -> processing.

    Ghi sổ bán + cộng lãi owner; nếu bật guest_auto_fulfill và đơn AUTO thì gọi
    NCC ngay. Báo Telegram cho admin. Idempotent: đơn đã paid thì bỏ qua.
    """
    orders = list(
        db.scalars(select(Order).where(Order.payment_reference == reference)).all()
    )
    if not orders:
        raise NotFoundError("Không tìm thấy đơn cho mã thanh toán này.")

    auto_fulfill = settings_service.get_bool(db, settings_service.GUEST_AUTO_FULFILL_KEY, False)
    now = datetime.now(UTC)
    newly_paid: list[Order] = []

    for order in orders:
        if order.payment_status == "paid":
            continue
        product = db.get(Product, order.product_id) if order.product_id else None
        local_stock = product is not None and uses_local_stock(db, product)

        order.payment_status = "paid"
        order.paid_at = now
        order.status = "processing"
        order.note = "Đã thanh toán, chờ xử lý."

        # Tự động lấy hàng NCC nếu được bật và đơn không phải bàn giao thủ công.
        if auto_fulfill and product is not None and not order.manual_fulfillment_required:
            delivery = _fetch_from_supplier(db, order, product)
            if delivery.status == "success":
                order.delivered_content = delivery.content
                order.status = "success"
            elif delivery.status == "failed":
                order.status = "failed"
                order.note = delivery.note or "Nhà cung cấp hết hàng hoặc lỗi khi lấy hàng."
            else:
                order.note = delivery.note or "Đơn đang chờ nhà cung cấp xử lý."

        # Ghi sổ bán + cộng lãi owner + sold_count — CHỈ khi đơn không thất bại ngay
        # (mirror purchase(): đơn failed không book doanh thu để sổ sách/kho sạch).
        if order.status != "failed" and product is not None:
            product.sold_count = (product.sold_count or 0) + (order.quantity or 0)
            _record_sale_ledger(db, order, product, local_stock=local_stock,
                                reason="Bán hàng (khách vãng lai)")
            credit_owner_profit(db, order)

        newly_paid.append(order)

    db.commit()
    for order in orders:
        db.refresh(order)

    if newly_paid:
        # Báo admin (không phá luồng nếu lỗi/chưa cấu hình).
        try:
            msg = notification_service.build_admin_order_message(db, newly_paid)
            notification_service.notify_admin(db, msg)
        except Exception:  # noqa: BLE001
            pass
        # Báo khách nếu đơn đã có kết quả cuối + có email.
        for order in newly_paid:
            if order.status in {"success", "failed"} and order.guest_email:
                _notify_customer_result(db, order)

    return orders


def fulfill_order_admin(
    db: Session,
    order: Order,
    *,
    result: str,
    delivered_content: str | None = None,
    note: str | None = None,
    actor_id: int | None = None,
) -> Order:
    """Admin duyệt đơn: đánh dấu thành công (kèm nội dung giao) hoặc thất bại.

    - success: set delivered_content + status='success'; phát hành hóa đơn/bảo hành
      cho đơn có user (guest bỏ qua hóa đơn — không có tài khoản).
    - failed: status='failed'; đơn ví (logged-in) hoàn ví, đơn guest KHÔNG tự hoàn.
    """
    if order.status not in {"processing", "awaiting_payment"}:
        raise AppException("Chỉ đơn đang xử lý mới có thể duyệt.")
    if result not in {"success", "failed"}:
        raise AppException("Kết quả không hợp lệ (success|failed).")

    if result == "success":
        if delivered_content:
            order.delivered_content = delivered_content
        order.status = "success"
        if note:
            order.note = note
        product = db.get(Product, order.product_id) if order.product_id else None
        user = db.get(User, order.user_id) if order.user_id else None
        if product is not None and user is not None:
            invoice_service.issue_for_order(db, order, product, user, commit=False)
            warranty_service.create_for_order(db, order, product, commit=False)
    else:  # failed
        order.status = "failed"
        if order.user_id:
            # Đơn ví: hoàn tiền vào ví + đảo lãi owner + đảo sổ (tái dùng cancel logic).
            user = db.get(User, order.user_id)
            if user is not None:
                user.balance = (user.balance or Decimal("0")) + (order.total_amount or Decimal("0"))
            reverse_owner_profit(db, order)
            _reverse_sale_ledger(db, order, actor_id=actor_id or order.user_id)
            order.note = note or "Đơn xử lý thất bại, đã hoàn tiền vào ví."
        else:
            order.note = note or "Đơn xử lý thất bại. Vui lòng liên hệ để được hoàn tiền."

    db.commit()
    db.refresh(order)

    if order.guest_email:
        _notify_customer_result(db, order)
    return order


def retry_provider(db: Session, order: Order) -> Order:
    """Admin bấm 'Lấy hàng NCC' cho đơn processing — gọi lại NCC và cập nhật."""
    if order.status != "processing":
        raise AppException("Chỉ đơn đang xử lý mới lấy hàng nhà cung cấp được.")
    product = db.get(Product, order.product_id) if order.product_id else None
    if product is None:
        raise NotFoundError("Sản phẩm của đơn không còn tồn tại.")

    delivery = _fetch_from_supplier(db, order, product)
    if delivery.status == "success":
        order.delivered_content = delivery.content
        order.status = "success"
        user = db.get(User, order.user_id) if order.user_id else None
        if user is not None:
            invoice_service.issue_for_order(db, order, product, user, commit=False)
            warranty_service.create_for_order(db, order, product, commit=False)
    elif delivery.status == "failed":
        order.status = "failed"
        order.note = delivery.note or "Nhà cung cấp hết hàng hoặc lỗi khi lấy hàng."
    else:
        order.note = delivery.note or "Đơn đang chờ nhà cung cấp xử lý."

    db.commit()
    db.refresh(order)

    if order.status in {"success", "failed"} and order.guest_email:
        _notify_customer_result(db, order)
    return order


def _reverse_sale_ledger(db: Session, order: Order, *, actor_id: int) -> None:
    """Đảo sổ kho/dòng tiền của một đơn đã ghi sổ bán (khi duyệt thất bại)."""
    product = db.get(Product, order.product_id) if order.product_id else None
    already_sold = product is not None and has_movement(
        db, ref_type="order", ref_id=order.id, type="out"
    )
    already_returned = has_movement(db, ref_type="order", ref_id=order.id, type="return")
    if product is None or not already_sold or already_returned:
        return
    refund = order.total_amount or Decimal("0")
    if uses_local_stock(db, product):
        apply_movement(
            db, product, type="return", quantity_delta=order.quantity or 0,
            reason="Đơn thất bại — hồi kho", ref_type="order", ref_id=order.id,
            user_id=actor_id, cash_out=refund, commit=False,
        )
    else:
        apply_movement(
            db, product, type="return", quantity_delta=0,
            reason="Đơn thất bại (NCC) — hoàn tiền", ref_type="order", ref_id=order.id,
            user_id=actor_id, cash_out=refund, cash_in=order.total_cost or Decimal("0"),
            tracks_stock=False, commit=False,
        )
    db.commit()


def _notify_customer_result(db: Session, order: Order) -> None:
    """Gửi email kết quả cho khách (best-effort)."""
    try:
        subject, html = notification_service.build_customer_result_message(db, order)
        notification_service.send_customer_email(db, order.guest_email, subject, html)
    except Exception:  # noqa: BLE001
        pass
