"""Model module Payments: tài khoản ngân hàng và giao dịch nạp tiền.

- BankAccount: cấu hình ngân hàng nhận tiền + QR sẵn của Admin.
- Deposit: lịch sử nạp tiền, có mã định danh để webhook đối soát.
"""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class BankAccount(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "bank_accounts"

    bank_name: Mapped[str] = mapped_column(String(255))
    account_number: Mapped[str] = mapped_column(String(64))
    account_holder: Mapped[str] = mapped_column(String(255))
    # QR sẵn của Admin (ảnh tĩnh) — user quét rồi nhập tay nội dung.
    qr_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)


class Deposit(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "deposits"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    # Mã định danh duy nhất đưa vào nội dung CK (vd: NAP TIEN USER123-AB12).
    reference_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    method: Mapped[str] = mapped_column(String(20), default="bank")  # bank | qr_auto | manual
    # pending | success | failed
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    bank_account_id: Mapped[int | None] = mapped_column(
        ForeignKey("bank_accounts.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
