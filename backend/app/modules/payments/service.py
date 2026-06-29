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

    qr_url = None
    if method == "qr_auto" and bank_account_id:
        bank = db.get(BankAccount, bank_account_id)
        if bank:
            qr_url = build_vietqr_url(bank, amount, reference)

    return {
        "deposit_id": deposit.id,
        "reference_code": reference,
        "amount": str(amount),
        "qr_url": qr_url,
        "status": deposit.status,
    }


def process_webhook(db: Session, reference_code: str, amount: Decimal, signature: str) -> dict:
    """Xử lý báo có (callback) từ ngân hàng. Cộng tiền nếu hợp lệ và chưa xử lý."""
    expected = _sign(reference_code, amount)
    if not hmac.compare_digest(expected, signature):
        raise AppException("Chữ ký webhook không hợp lệ.", 401)

    deposit = db.scalars(select(Deposit).where(Deposit.reference_code == reference_code)).first()
    if deposit is None:
        raise NotFoundError("Không tìm thấy giao dịch nạp.")
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
