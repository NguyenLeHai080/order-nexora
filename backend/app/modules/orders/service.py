"""Service Orders — luồng mua sản phẩm số.

Luồng: kiểm tra sản phẩm/kho -> tính giá (áp voucher) -> trừ ví -> gọi API
nhà cung cấp lấy hàng real-time -> giao hàng -> ghi nhận. Nếu lấy hàng thất bại
thì hoàn tiền (rollback) và đánh dấu đơn failed.
"""
import secrets
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundError
from app.modules.orders.models import Order
from app.modules.products.models import Product
from app.modules.users.models import User
from app.modules.vouchers.service import apply_voucher


def _gen_code() -> str:
    return f"OD-{secrets.token_hex(4).upper()}"


def _fetch_from_supplier(product: Product) -> str | None:
    """Gọi API nhà cung cấp lấy hàng real-time.

    Bản nền trả về nội dung giả lập. Khi tích hợp thật, dùng httpx gọi
    product.supplier.api_endpoint với external_id và api_key.
    """
    if product.stock_status == "out_of_stock":
        return None
    return f"[DELIVERED] {product.name} - mã: {secrets.token_hex(6).upper()}"


def purchase(db: Session, user_id: int, product_id: int, quantity: int, voucher_code: str | None) -> Order:
    product = db.get(Product, product_id)
    if product is None or product.status != "active":
        raise NotFoundError("Sản phẩm không tồn tại hoặc đã ngừng bán.")
    if product.stock_status == "out_of_stock":
        raise AppException("Sản phẩm đã hết hàng.")

    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("Người dùng không tồn tại.")

    unit_price = product.sale_price
    total = unit_price * Decimal(quantity)

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
        status="processing",
        organization_id=product.organization_id,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Gọi nhà cung cấp lấy hàng.
    delivered = _fetch_from_supplier(product)
    if delivered is None:
        # Hoàn tiền + đánh dấu thất bại.
        user.balance = user.balance + total
        order.status = "failed"
        order.note = "Nhà cung cấp hết hàng hoặc lỗi khi lấy hàng."
        db.commit()
        raise AppException("Lấy hàng thất bại, đã hoàn tiền vào ví.")

    order.delivered_content = delivered
    order.status = "success"
    product.sold_count = (product.sold_count or 0) + quantity
    db.commit()
    db.refresh(order)
    return order
