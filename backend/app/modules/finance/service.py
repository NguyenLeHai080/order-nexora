"""Service Finance — sổ cái ví, phiếu thu/chi, rút tiền, đối soát công nợ NCC.

`post_wallet_txn` là CHOKE-POINT duy nhất được phép sửa `User.balance` sau khi
retrofit: nó vừa cập nhật số dư (có guard không âm) vừa ghi một dòng sổ cái
kèm `balance_after`. Mọi luồng cộng/trừ ví (nạp, mua, hoàn, lãi chủ, rút) phải
đi qua đây để có dấu vết đầy đủ.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundError
from app.modules.finance.models import (
    CashEntry,
    SupplierSettlement,
    WalletTransaction,
    WithdrawalRequest,
)
from app.modules.orders.models import Order
from app.modules.suppliers.models import Supplier
from app.modules.users.models import User

_ZERO = Decimal("0")


def post_wallet_txn(
    db: Session,
    user: User,
    *,
    type: str,
    direction: str,
    amount: Decimal,
    organization_id: int | None = None,
    ref_type: str | None = None,
    ref_id: int | None = None,
    note: str | None = None,
    actor_id: int | None = None,
    allow_negative: bool = False,
) -> WalletTransaction:
    """Cập nhật số dư ví + ghi 1 dòng sổ cái. Nơi DUY NHẤT sửa User.balance.

    direction='in' cộng ví, 'out' trừ ví (guard không cho âm). `amount` luôn > 0.
    Không tự commit — người gọi kiểm soát transaction (commit/rollback theo luồng).
    `organization_id` truyền từ order/deposit để scope sổ cái (User là đa-tổ-chức).
    `allow_negative=True` cho các bút toán nội bộ (đảo lãi ví chủ) vốn không kiểm
    tra số dư — giữ đúng hành vi cũ.
    """
    amount = Decimal(amount)
    if amount < 0:
        # Chuẩn hóa: luôn lưu amount dương + direction quyết định dấu.
        amount = -amount
        direction = "out" if direction == "in" else "in"

    current = user.balance or _ZERO
    new_balance = current + amount if direction == "in" else current - amount
    if new_balance < 0 and not allow_negative:
        raise AppException("Số dư không đủ để thực hiện giao dịch.")

    user.balance = new_balance
    txn = WalletTransaction(
        user_id=user.id,
        organization_id=organization_id,
        type=type,
        direction=direction,
        amount=amount,
        balance_after=new_balance,
        ref_type=ref_type,
        ref_id=ref_id,
        note=note,
        actor_id=actor_id,
    )
    db.add(txn)
    db.flush()
    return txn


# ── Sổ cái ví ────────────────────────────────────────────────────────────────

def list_wallet_txns(
    db: Session,
    organization_id: int | None,
    *,
    user_id: int | None = None,
    type: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[WalletTransaction], int]:
    stmt = select(WalletTransaction)
    if organization_id is not None:
        stmt = stmt.where(WalletTransaction.organization_id == organization_id)
    if user_id is not None:
        stmt = stmt.where(WalletTransaction.user_id == user_id)
    if type:
        stmt = stmt.where(WalletTransaction.type == type)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(WalletTransaction.id.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt).all()), total


# ── Phiếu thu/chi thủ công ────────────────────────────────────────────────────

def list_cash_entries(
    db: Session,
    organization_id: int | None,
    *,
    kind: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[CashEntry], int]:
    stmt = select(CashEntry)
    if organization_id is not None:
        stmt = stmt.where(CashEntry.organization_id == organization_id)
    if kind:
        stmt = stmt.where(CashEntry.kind == kind)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(CashEntry.occurred_on.desc(), CashEntry.id.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt).all()), total


def create_cash_entry(
    db: Session,
    organization_id: int | None,
    *,
    kind: str,
    amount: Decimal,
    category: str | None,
    note: str | None,
    occurred_on,
    actor_id: int | None,
) -> CashEntry:
    entry = CashEntry(
        organization_id=organization_id,
        kind=kind,
        amount=Decimal(amount),
        category=category,
        note=note,
        occurred_on=occurred_on,
        actor_id=actor_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_cash_entry(db: Session, entry: CashEntry, **fields) -> CashEntry:
    for key, value in fields.items():
        if value is not None:
            setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_cash_entry(db: Session, entry: CashEntry) -> None:
    db.delete(entry)
    db.commit()


# ── Rút tiền ─────────────────────────────────────────────────────────────────

def list_withdrawals(
    db: Session,
    organization_id: int | None,
    *,
    user_id: int | None = None,
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[WithdrawalRequest], int]:
    stmt = select(WithdrawalRequest)
    if organization_id is not None:
        stmt = stmt.where(WithdrawalRequest.organization_id == organization_id)
    if user_id is not None:
        stmt = stmt.where(WithdrawalRequest.user_id == user_id)
    if status:
        stmt = stmt.where(WithdrawalRequest.status == status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(WithdrawalRequest.id.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt).all()), total


def create_withdrawal(
    db: Session,
    *,
    user_id: int,
    amount: Decimal,
    bank_info: str | None,
    note: str | None,
    actor_id: int | None,
    organization_id: int | None = None,
) -> WithdrawalRequest:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("Người dùng không tồn tại.")
    amount = Decimal(amount)
    if amount <= 0:
        raise AppException("Số tiền rút phải lớn hơn 0.")
    if (user.balance or _ZERO) < amount:
        raise AppException("Số dư không đủ để tạo yêu cầu rút.")
    wr = WithdrawalRequest(
        user_id=user_id,
        organization_id=organization_id,
        amount=amount,
        status="pending",
        bank_info=bank_info,
        note=note,
        actor_id=actor_id,
    )
    db.add(wr)
    db.commit()
    db.refresh(wr)
    return wr


def pay_withdrawal(db: Session, wr: WithdrawalRequest, *, actor_id: int | None) -> WithdrawalRequest:
    """Duyệt & chi: trừ ví qua sổ cái, chuyển trạng thái paid."""
    if wr.status != "pending":
        raise AppException("Yêu cầu rút đã được xử lý.")
    user = db.get(User, wr.user_id)
    if user is None:
        raise NotFoundError("Người dùng không tồn tại.")
    post_wallet_txn(
        db, user,
        type="withdrawal", direction="out", amount=wr.amount,
        organization_id=wr.organization_id,
        ref_type="withdrawal", ref_id=wr.id,
        note="Chi rút tiền", actor_id=actor_id,
    )
    wr.status = "paid"
    wr.actor_id = actor_id
    wr.processed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(wr)
    return wr


def reject_withdrawal(db: Session, wr: WithdrawalRequest, *, actor_id: int | None, note: str | None) -> WithdrawalRequest:
    if wr.status != "pending":
        raise AppException("Yêu cầu rút đã được xử lý.")
    wr.status = "rejected"
    wr.actor_id = actor_id
    if note:
        wr.note = note
    wr.processed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(wr)
    return wr


# ── Công nợ & tất toán NCC ────────────────────────────────────────────────────

def supplier_debt_summary(db: Session, organization_id: int | None) -> list[dict]:
    """Tổng hợp công nợ phải trả từng NCC: payable − settled = outstanding."""
    payable_stmt = (
        select(
            Order.supplier_id,
            func.coalesce(func.sum(Order.supplier_payable), 0).label("payable"),
        )
        .where(Order.status == "success", Order.supplier_id.isnot(None))
        .group_by(Order.supplier_id)
    )
    if organization_id is not None:
        payable_stmt = payable_stmt.where(Order.organization_id == organization_id)
    payable_map = {row.supplier_id: row.payable or _ZERO for row in db.execute(payable_stmt).all()}

    settled_stmt = (
        select(
            SupplierSettlement.supplier_id,
            func.coalesce(func.sum(SupplierSettlement.amount), 0).label("settled"),
        )
        .group_by(SupplierSettlement.supplier_id)
    )
    if organization_id is not None:
        settled_stmt = settled_stmt.where(SupplierSettlement.organization_id == organization_id)
    settled_map = {row.supplier_id: row.settled or _ZERO for row in db.execute(settled_stmt).all()}

    supplier_ids = set(payable_map) | set(settled_map)
    if not supplier_ids:
        return []
    name_map = {
        s.id: s.name
        for s in db.scalars(select(Supplier).where(Supplier.id.in_(supplier_ids))).all()
    }
    result = []
    for sid in supplier_ids:
        payable = Decimal(payable_map.get(sid, _ZERO))
        settled = Decimal(settled_map.get(sid, _ZERO))
        result.append(
            {
                "supplier_id": sid,
                "supplier_name": name_map.get(sid, f"NCC #{sid}"),
                "payable": str(payable),
                "settled": str(settled),
                "outstanding": str(payable - settled),
            }
        )
    result.sort(key=lambda r: Decimal(r["outstanding"]), reverse=True)
    return result


def list_settlements(
    db: Session,
    organization_id: int | None,
    *,
    supplier_id: int | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[SupplierSettlement], int]:
    stmt = select(SupplierSettlement)
    if organization_id is not None:
        stmt = stmt.where(SupplierSettlement.organization_id == organization_id)
    if supplier_id is not None:
        stmt = stmt.where(SupplierSettlement.supplier_id == supplier_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(SupplierSettlement.id.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt).all()), total


def create_settlement(
    db: Session,
    organization_id: int | None,
    *,
    supplier_id: int,
    amount: Decimal,
    note: str | None,
    actor_id: int | None,
) -> SupplierSettlement:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise NotFoundError("Nhà cung cấp không tồn tại.")
    amount = Decimal(amount)
    if amount <= 0:
        raise AppException("Số tiền tất toán phải lớn hơn 0.")
    s = SupplierSettlement(
        organization_id=organization_id,
        supplier_id=supplier_id,
        amount=amount,
        note=note,
        actor_id=actor_id,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


# ── Tổng quan tài chính ───────────────────────────────────────────────────────

def overview(db: Session, organization_id: int | None, owner_user_id: int | None) -> dict:
    """Số liệu tổng quan cho dashboard tài chính."""
    def _cash_sum(kind: str) -> Decimal:
        stmt = select(func.coalesce(func.sum(CashEntry.amount), 0)).where(CashEntry.kind == kind)
        if organization_id is not None:
            stmt = stmt.where(CashEntry.organization_id == organization_id)
        return Decimal(db.scalar(stmt) or 0)

    cash_income = _cash_sum("income")
    cash_expense = _cash_sum("expense")

    pending_stmt = select(
        func.coalesce(func.sum(WithdrawalRequest.amount), 0), func.count(WithdrawalRequest.id)
    ).where(WithdrawalRequest.status == "pending")
    if organization_id is not None:
        pending_stmt = pending_stmt.where(WithdrawalRequest.organization_id == organization_id)
    pending_amount, pending_count = db.execute(pending_stmt).one()

    debt = supplier_debt_summary(db, organization_id)
    outstanding_total = sum((Decimal(d["outstanding"]) for d in debt), _ZERO)

    total_wallet_stmt = select(func.coalesce(func.sum(User.balance), 0))
    total_wallet = Decimal(db.scalar(total_wallet_stmt) or 0)

    owner = db.get(User, owner_user_id) if owner_user_id else None

    return {
        "owner_wallet_user_id": owner_user_id,
        "owner_wallet_balance": str(owner.balance) if owner is not None else None,
        "cash_income": str(cash_income),
        "cash_expense": str(cash_expense),
        "cash_net": str(cash_income - cash_expense),
        "withdrawal_pending_amount": str(Decimal(pending_amount or 0)),
        "withdrawal_pending_count": pending_count or 0,
        "supplier_outstanding": str(outstanding_total),
        "total_wallet_balance": str(total_wallet),
    }
