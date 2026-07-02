"""Router Finance — sổ cái ví, phiếu thu/chi, rút tiền, công nợ NCC, tổng quan.

Endpoints admin dùng quyền `finance.*`. Endpoints `/me` chỉ cần đăng nhập —
khách xem sổ ví / yêu cầu rút của chính mình (không lộ dữ liệu người khác).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import get_context, get_current_user, require
from app.modules.finance import service
from app.modules.finance.models import CashEntry, SupplierSettlement, WithdrawalRequest
from app.modules.finance.schemas import (
    CashEntryCreate,
    CashEntryOut,
    CashEntryUpdate,
    SettlementCreate,
    SettlementOut,
    WalletTxnOut,
    WithdrawalCreate,
    WithdrawalOut,
    WithdrawalReject,
)
from app.modules.orders.service import resolve_owner_user_id
from app.modules.users.models import User

router = APIRouter(prefix="/finance", tags=["Finance"])


def _txn_out(t) -> dict:
    return WalletTxnOut.model_validate(t).model_dump(mode="json")


# ── Tổng quan ────────────────────────────────────────────────────────────────

@router.get("/overview", summary="Tổng quan tài chính")
def overview(
    ctx: RequestContext = Depends(require("finance.index")),
    db: Session = Depends(get_db),
) -> dict:
    owner_user_id = resolve_owner_user_id(db, ctx.organization_id, ctx.user_id)
    return success(service.overview(db, ctx.organization_id, owner_user_id))


# ── Sổ cái ví ────────────────────────────────────────────────────────────────

@router.get("/wallet", summary="Sổ cái ví (admin)")
def wallet_ledger(
    params: ListParams = Depends(list_params),
    user_id: int | None = Query(None, description="Lọc theo người dùng"),
    type: str | None = Query(None, description="Lọc theo loại giao dịch"),
    ctx: RequestContext = Depends(require("finance.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = service.list_wallet_txns(
        db, ctx.organization_id, user_id=user_id, type=type,
        limit=params.limit, offset=params.offset,
    )
    return paginated([_txn_out(t) for t in items], total, params.page, params.limit)


@router.get("/wallet/me", summary="Sổ ví của tôi")
def my_wallet(
    params: ListParams = Depends(list_params),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    items, total = service.list_wallet_txns(
        db, None, user_id=user.id, limit=params.limit, offset=params.offset,
    )
    return paginated([_txn_out(t) for t in items], total, params.page, params.limit)


# ── Phiếu thu/chi ─────────────────────────────────────────────────────────────

@router.get("/cash-entries", summary="Danh sách phiếu thu/chi")
def list_cash_entries(
    params: ListParams = Depends(list_params),
    kind: str | None = Query(None, pattern="^(income|expense)$"),
    ctx: RequestContext = Depends(require("finance.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = service.list_cash_entries(
        db, ctx.organization_id, kind=kind, limit=params.limit, offset=params.offset,
    )
    return paginated(
        [CashEntryOut.model_validate(i).model_dump(mode="json") for i in items],
        total, params.page, params.limit,
    )


@router.post("/cash-entries", status_code=201, summary="Thêm phiếu thu/chi")
def create_cash_entry(
    body: CashEntryCreate,
    ctx: RequestContext = Depends(require("finance.store")),
    db: Session = Depends(get_db),
) -> dict:
    entry = service.create_cash_entry(
        db, ctx.organization_id,
        kind=body.kind, amount=body.amount, category=body.category,
        note=body.note, occurred_on=body.occurred_on, actor_id=ctx.user_id,
    )
    return success(CashEntryOut.model_validate(entry).model_dump(mode="json"), "Đã ghi phiếu.")


@router.put("/cash-entries/{entry_id}", summary="Sửa phiếu thu/chi")
def update_cash_entry(
    entry_id: int,
    body: CashEntryUpdate,
    _ctx: RequestContext = Depends(require("finance.update")),
    db: Session = Depends(get_db),
) -> dict:
    entry = db.get(CashEntry, entry_id)
    if entry is None:
        raise NotFoundError("Không tìm thấy phiếu.")
    entry = service.update_cash_entry(db, entry, **body.model_dump())
    return success(CashEntryOut.model_validate(entry).model_dump(mode="json"), "Đã cập nhật.")


@router.delete("/cash-entries/{entry_id}", summary="Xóa phiếu thu/chi")
def delete_cash_entry(
    entry_id: int,
    _ctx: RequestContext = Depends(require("finance.destroy")),
    db: Session = Depends(get_db),
) -> dict:
    entry = db.get(CashEntry, entry_id)
    if entry is None:
        raise NotFoundError("Không tìm thấy phiếu.")
    service.delete_cash_entry(db, entry)
    return success(None, "Đã xóa phiếu.")


# ── Rút tiền ─────────────────────────────────────────────────────────────────

@router.get("/withdrawals", summary="Danh sách yêu cầu rút tiền (admin)")
def list_withdrawals(
    params: ListParams = Depends(list_params),
    user_id: int | None = Query(None),
    ctx: RequestContext = Depends(require("finance.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = service.list_withdrawals(
        db, ctx.organization_id, user_id=user_id, status=params.status,
        limit=params.limit, offset=params.offset,
    )
    return paginated(
        [WithdrawalOut.model_validate(i).model_dump(mode="json") for i in items],
        total, params.page, params.limit,
    )


@router.get("/withdrawals/me", summary="Yêu cầu rút của tôi")
def my_withdrawals(
    params: ListParams = Depends(list_params),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    items, total = service.list_withdrawals(
        db, None, user_id=user.id, limit=params.limit, offset=params.offset,
    )
    return paginated(
        [WithdrawalOut.model_validate(i).model_dump(mode="json") for i in items],
        total, params.page, params.limit,
    )


@router.post("/withdrawals", status_code=201, summary="Tạo yêu cầu rút tiền")
def create_withdrawal(
    body: WithdrawalCreate,
    user: User = Depends(get_current_user),
    ctx: RequestContext = Depends(get_context),
    db: Session = Depends(get_db),
) -> dict:
    # Admin (finance.store) tạo hộ user khác; còn lại chỉ tạo cho chính mình.
    target_user_id = body.user_id or user.id
    if target_user_id != user.id and not ctx.has_permission("finance.store"):
        raise ForbiddenError("Bạn chỉ có thể tạo yêu cầu rút cho chính mình.")
    wr = service.create_withdrawal(
        db, user_id=target_user_id, amount=body.amount,
        bank_info=body.bank_info, note=body.note, actor_id=user.id,
        organization_id=ctx.organization_id,
    )
    return success(WithdrawalOut.model_validate(wr).model_dump(mode="json"), "Đã tạo yêu cầu rút.")


@router.post("/withdrawals/{wr_id}/pay", summary="[Admin] Duyệt & chi rút tiền")
def pay_withdrawal(
    wr_id: int,
    ctx: RequestContext = Depends(require("finance.update")),
    db: Session = Depends(get_db),
) -> dict:
    wr = db.get(WithdrawalRequest, wr_id)
    if wr is None:
        raise NotFoundError("Không tìm thấy yêu cầu rút.")
    wr = service.pay_withdrawal(db, wr, actor_id=ctx.user_id)
    return success(WithdrawalOut.model_validate(wr).model_dump(mode="json"), "Đã chi rút tiền.")


@router.post("/withdrawals/{wr_id}/reject", summary="[Admin] Từ chối yêu cầu rút")
def reject_withdrawal(
    wr_id: int,
    body: WithdrawalReject,
    ctx: RequestContext = Depends(require("finance.update")),
    db: Session = Depends(get_db),
) -> dict:
    wr = db.get(WithdrawalRequest, wr_id)
    if wr is None:
        raise NotFoundError("Không tìm thấy yêu cầu rút.")
    wr = service.reject_withdrawal(db, wr, actor_id=ctx.user_id, note=body.note)
    return success(WithdrawalOut.model_validate(wr).model_dump(mode="json"), "Đã từ chối yêu cầu.")


# ── Công nợ & tất toán NCC ────────────────────────────────────────────────────

@router.get("/supplier-debt", summary="Công nợ phải trả nhà cung cấp")
def supplier_debt(
    ctx: RequestContext = Depends(require("finance.index")),
    db: Session = Depends(get_db),
) -> dict:
    return success(service.supplier_debt_summary(db, ctx.organization_id))


@router.get("/settlements", summary="Lịch sử tất toán NCC")
def list_settlements(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("finance.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = service.list_settlements(
        db, ctx.organization_id, supplier_id=params.supplier_id,
        limit=params.limit, offset=params.offset,
    )
    return paginated(
        [SettlementOut.model_validate(i).model_dump(mode="json") for i in items],
        total, params.page, params.limit,
    )


@router.post("/settlements", status_code=201, summary="Ghi một lần tất toán NCC")
def create_settlement(
    body: SettlementCreate,
    ctx: RequestContext = Depends(require("finance.store")),
    db: Session = Depends(get_db),
) -> dict:
    s = service.create_settlement(
        db, ctx.organization_id,
        supplier_id=body.supplier_id, amount=body.amount, note=body.note, actor_id=ctx.user_id,
    )
    return success(SettlementOut.model_validate(s).model_dump(mode="json"), "Đã ghi tất toán NCC.")
