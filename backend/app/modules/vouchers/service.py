"""Service Voucher — validate và áp dụng giảm giá lên tổng tiền."""
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.modules.vouchers.models import Voucher


def validate_voucher(db: Session, code: str) -> Voucher:
    voucher = db.scalars(select(Voucher).where(Voucher.code == code)).first()
    if voucher is None:
        raise AppException("Mã giảm giá không tồn tại.")
    if voucher.status != "active":
        raise AppException("Mã giảm giá đã bị vô hiệu hóa.")

    now = datetime.now(UTC)
    if voucher.starts_at and now < voucher.starts_at:
        raise AppException("Mã giảm giá chưa đến thời gian sử dụng.")
    if voucher.ends_at and now > voucher.ends_at:
        raise AppException("Mã giảm giá đã hết hạn.")
    if voucher.usage_limit and voucher.used_count >= voucher.usage_limit:
        raise AppException("Mã giảm giá đã hết lượt sử dụng.")
    return voucher


def compute_discount(voucher: Voucher, total: Decimal) -> Decimal:
    if voucher.discount_type == "percent":
        discount = total * voucher.discount_value / Decimal("100")
        if voucher.max_discount and discount > voucher.max_discount:
            discount = voucher.max_discount
    else:
        discount = voucher.discount_value
    return min(discount, total)  # không giảm quá tổng tiền


def apply_voucher(db: Session, code: str, total: Decimal) -> Decimal:
    """Validate + tính giá sau giảm + tăng used_count. Trả về tổng tiền mới."""
    voucher = validate_voucher(db, code)
    discount = compute_discount(voucher, total)
    voucher.used_count += 1
    db.commit()
    return total - discount
