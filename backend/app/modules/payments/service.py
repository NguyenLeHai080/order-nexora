"""Service Payments: tạo yêu cầu nạp, sinh QR, xử lý webhook an toàn.

Webhook xác thực bằng HMAC-SHA256 trên (reference_code + amount) với khóa bí mật
để chống user fake hóa đơn nạp tiền.
"""
import hashlib
import hmac
import secrets
from decimal import Decimal
from urllib.parse import quote

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppException, NotFoundError
from app.modules.payments.models import BankAccount, Deposit
from app.modules.users.models import User


def _gen_reference(user_id: int) -> str:
    """Sinh mã định danh duy nhất đưa vào nội dung chuyển khoản."""
    return f"NAPTIEN-U{user_id}-{secrets.token_hex(3).upper()}"


def _sign(reference_code: str, amount: Decimal) -> str:
    msg = f"{reference_code}:{amount}".encode()
    return hmac.new(settings.jwt_secret.encode(), msg, hashlib.sha256).hexdigest()


def build_vietqr_url(bank: BankAccount, amount: Decimal, reference_code: str) -> str:
    """Tạo link ảnh VietQR kèm sẵn số tiền + nội dung (chuẩn img.vietqr.io)."""
    note = quote(reference_code)
    return (
        f"https://img.vietqr.io/image/{quote(bank.bank_name)}-{bank.account_number}-compact.png"
        f"?amount={amount}&addInfo={note}&accountName={quote(bank.account_holder)}"
    )


def create_deposit(
    db: Session, user_id: int, amount: Decimal, method: str, bank_account_id: int | None
) -> dict:
    reference = _gen_reference(user_id)
    deposit = Deposit(
        user_id=user_id,
        amount=amount,
        reference_code=reference,
        method=method,
        status="pending",
        bank_account_id=bank_account_id,
    )
    db.add(deposit)
    db.commit()
    db.refresh(deposit)

    # Với QR tự động: nếu client không chỉ định bank, tự chọn ngân hàng active
    # đầu tiên. Cần thiết cho khách lẻ (role 'user') vì họ KHÔNG có quyền
    # payments.index để tự liệt kê ngân hàng — checkout landing chỉ gửi amount.
    qr_url = None
    bank: BankAccount | None = None
    if method == "qr_auto":
        if bank_account_id:
            bank = db.get(BankAccount, bank_account_id)
        if bank is None:
            bank = db.scalars(
                select(BankAccount).where(BankAccount.status == "active").order_by(BankAccount.id.asc())
            ).first()
        if bank:
            qr_url = build_vietqr_url(bank, amount, reference)

    return {
        "deposit_id": deposit.id,
        "reference_code": reference,
        "amount": str(amount),
        "qr_url": qr_url,
        "status": deposit.status,
        # Thông tin chuyển khoản thủ công (phòng khi user không quét QR được).
        "bank": (
            {
                "bank_name": bank.bank_name,
                "account_number": bank.account_number,
                "account_holder": bank.account_holder,
            }
            if bank
            else None
        ),
    }


def process_webhook(db: Session, reference_code: str, amount: Decimal, signature: str) -> dict:
    """Xử lý báo có (callback) từ ngân hàng. Cộng ví (nạp tiền) HOẶC đánh dấu đơn
    khách vãng lai đã thanh toán, tùy reference khớp Deposit hay Order.

    Xác thực HMAC-SHA256 trên (reference_code + amount) với jwt_secret cho cả 2 luồng.
    """
    expected = _sign(reference_code, amount)
    if not hmac.compare_digest(expected, signature):
        raise AppException("Chữ ký webhook không hợp lệ.", 401)

    deposit = db.scalars(select(Deposit).where(Deposit.reference_code == reference_code)).first()
    if deposit is not None:
        if deposit.status == "success":
            return {"reference_code": reference_code, "status": "already_processed"}
        if deposit.amount != amount:
            raise AppException("Số tiền không khớp giao dịch.")

        # Cộng tiền vào ví user (idempotent nhờ check status).
        user = db.get(User, deposit.user_id)
        if user is None:
            raise NotFoundError("Người dùng không tồn tại.")
        user.balance = (user.balance or Decimal("0")) + amount
        deposit.status = "success"
        db.commit()
        return {"reference_code": reference_code, "status": "success"}

    # Không phải giao dịch nạp — thử khớp đơn khách vãng lai (payment_reference).
    from app.modules.orders.models import Order
    from app.modules.orders import service as order_service

    orders = list(db.scalars(select(Order).where(Order.payment_reference == reference_code)).all())
    if not orders:
        raise NotFoundError("Không tìm thấy giao dịch nạp.")

    if all(o.payment_status == "paid" for o in orders):
        return {"reference_code": reference_code, "status": "already_processed"}

    expected_total = sum((o.total_amount or Decimal("0")) for o in orders)
    if expected_total != amount:
        raise AppException("Số tiền không khớp đơn hàng.")

    order_service.mark_order_paid(db, reference_code)
    return {"reference_code": reference_code, "status": "success", "kind": "guest_order"}
