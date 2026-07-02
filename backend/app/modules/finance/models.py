"""Model module Finance — sổ cái ví, phiếu thu/chi, rút tiền, tất toán NCC.

Bốn bảng bổ trợ cho luồng tài chính:
- WalletTransaction: sổ cái (ledger) MỌI lần cộng/trừ ví. `User.balance` chỉ là
  số dư cộng dồn; bảng này lưu dấu vết từng biến động + số dư sau biến động.
- CashEntry: phiếu thu/chi tiền mặt thủ công (ngoài đơn hàng) để dòng tiền đủ.
- WithdrawalRequest: yêu cầu rút tiền, admin duyệt & chi (trừ ví qua ledger).
- SupplierSettlement: mỗi lần trả tiền cho một nhà cung cấp (đối soát công nợ).
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class WalletTransaction(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    """Sổ cái ví — mỗi dòng là một lần cộng/trừ số dư người dùng."""

    __tablename__ = "wallet_transactions"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # deposit | purchase | refund | owner_profit | withdrawal | adjustment
    type: Mapped[str] = mapped_column(String(20), index=True)
    direction: Mapped[str] = mapped_column(String(3))  # in | out
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    balance_after: Mapped[Decimal] = mapped_column(Numeric(18, 2))

    # Nguồn gốc: order | deposit | return | withdrawal | manual
    ref_type: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    ref_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class CashEntry(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    """Phiếu thu/chi tiền mặt thủ công — ngoài luồng đơn hàng và sổ kho."""

    __tablename__ = "cash_entries"

    kind: Mapped[str] = mapped_column(String(10), index=True)  # income | expense
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_on: Mapped[date] = mapped_column(Date, index=True)
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class WithdrawalRequest(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    """Yêu cầu rút tiền — admin duyệt & chi (trừ ví) hoặc từ chối."""

    __tablename__ = "withdrawal_requests"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    # pending | paid | rejected
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    bank_info: Mapped[str | None] = mapped_column(String(255), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class SupplierSettlement(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    """Một lần trả tiền cho nhà cung cấp (đối soát công nợ phải trả NCC)."""

    __tablename__ = "supplier_settlements"

    supplier_id: Mapped[int] = mapped_column(
        ForeignKey("suppliers.id", ondelete="CASCADE"), index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
