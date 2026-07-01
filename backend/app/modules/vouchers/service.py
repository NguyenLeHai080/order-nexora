"""Service Voucher — validate và áp dụng giảm giá lên tổng tiền."""
import re
import secrets
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.modules.vouchers.models import Voucher

# Bộ ký tự sinh mã ngẫu nhiên (bỏ ký tự dễ nhầm: 0/O, 1/I).
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _slug_prefix(description: str | None) -> str:
    """Lấy tiền tố mã từ mô tả: bỏ dấu/ký tự lạ, viết hoa, tối đa 12 ký tự.

    Mô tả rỗng -> trả "VC" để vẫn có tiền tố nhận diện.
    """
    if not description:
        return "VC"
    # Chỉ giữ chữ/số ASCII; gộp khoảng trắng thành "-".
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", "", description).strip().upper()
    cleaned = re.sub(r"\s+", "-", cleaned)
    return cleaned[:12] or "VC"


def generate_unique_code(db: Session, description: str | None = None) -> str:
    """Sinh mã voucher duy nhất: <PREFIX>-<RANDOM4>, đảm bảo chưa tồn tại.

    Thử tối đa vài lần với hậu tố ngẫu nhiên dài dần để tránh va chạm.
    """
    prefix = _slug_prefix(description)
    for length in (4, 4, 5, 6, 8):
        suffix = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(length))
        code = f"{prefix}-{suffix}"
        if db.scalars(select(Voucher).where(Voucher.code == code)).first() is None:
            return code
    # Cực hiếm khi tới đây — dùng token an toàn tuyệt đối.
    return f"{prefix}-{secrets.token_hex(6).upper()}"


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
