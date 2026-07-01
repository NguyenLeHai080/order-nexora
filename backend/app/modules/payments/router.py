"""Router Payments — ngân hàng nhận tiền, QR, nạp tiền, webhook, đối soát.

Webhook (/payments/webhook) KHÔNG yêu cầu auth — xác thực bằng chữ ký HMAC.
"""
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import get_current_user, require
from app.modules.payments import service
from app.modules.payments.models import BankAccount, Deposit
from app.modules.payments.schemas import (
    BankAccountCreate,
    BankAccountOut,
    BankAccountUpdate,
    DepositCreate,
    DepositOut,
    ManualConfirm,
    WebhookPayload,
)
from app.modules.users.models import User

router = APIRouter(prefix="/payments", tags=["Billing & Payment"])


# ---------- Bank accounts (Admin) ----------
@router.get("/banks", summary="Danh sách ngân hàng nhận tiền")
def list_banks(
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("payments.index")),
) -> dict:
    items = db.scalars(select(BankAccount)).all()
    return success([BankAccountOut.model_validate(b).model_dump() for b in items])


@router.post("/banks", status_code=201, summary="Thêm ngân hàng nhận tiền")
def create_bank(
    body: BankAccountCreate,
    ctx: RequestContext = Depends(require("payments.store")),
    db: Session = Depends(get_db),
) -> dict:
    obj = BankAccount(organization_id=ctx.organization_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return success(BankAccountOut.model_validate(obj).model_dump(), "Đã thêm ngân hàng.")


@router.put("/banks/{bank_id}", summary="Cập nhật ngân hàng")
def update_bank(
    bank_id: int,
    body: BankAccountUpdate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("payments.update")),
) -> dict:
    obj = db.get(BankAccount, bank_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy ngân hàng.")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return success(BankAccountOut.model_validate(obj).model_dump(), "Đã cập nhật ngân hàng.")


@router.delete("/banks/{bank_id}", summary="Xóa ngân hàng")
def delete_bank(
    bank_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("payments.destroy")),
) -> dict:
    obj = db.get(BankAccount, bank_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy ngân hàng.")
    db.delete(obj)
    db.commit()
    return success(message="Đã xóa ngân hàng.")


# ---------- Deposits ----------
@router.post("/deposits", status_code=201, summary="Tạo yêu cầu nạp tiền (sinh QR)")
def create_deposit(
    body: DepositCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    data = service.create_deposit(db, user.id, body.amount, body.method, body.bank_account_id)
    return success(data, "Đã tạo yêu cầu nạp tiền. Vui lòng chuyển khoản theo mã định danh.")


@router.get("/deposits", summary="Lịch sử nạp tiền")
def list_deposits(
    params: ListParams = Depends(list_params),
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("payments.index")),
) -> dict:
    stmt = select(Deposit)
    if params.status:
        stmt = stmt.where(Deposit.status == params.status)
    from sqlalchemy import func

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Deposit.id.desc()).limit(params.limit).offset(params.offset)
    items = db.scalars(stmt).all()
    return paginated(
        [DepositOut.model_validate(d).model_dump(mode="json") for d in items],
        total,
        params.page,
        params.limit,
    )


@router.get("/deposits/me", summary="Lịch sử nạp tiền của tôi")
def my_deposits(
    params: ListParams = Depends(list_params),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Khách xem lịch sử nạp của chính mình (không cần quyền payments.index)."""
    from sqlalchemy import func

    stmt = select(Deposit).where(Deposit.user_id == user.id)
    if params.status:
        stmt = stmt.where(Deposit.status == params.status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Deposit.id.desc()).limit(params.limit).offset(params.offset)
    items = db.scalars(stmt).all()
    return paginated(
        [DepositOut.model_validate(d).model_dump(mode="json") for d in items],
        total,
        params.page,
        params.limit,
    )


@router.post("/deposits/{deposit_id}/confirm", summary="Admin xác nhận nạp thủ công")
def confirm_deposit(
    deposit_id: int,
    body: ManualConfirm,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("payments.update")),
) -> dict:
    deposit = db.get(Deposit, deposit_id)
    if deposit is None:
        raise NotFoundError("Không tìm thấy giao dịch nạp.")
    if deposit.status != "success" and body.status == "success":
        user = db.get(User, deposit.user_id)
        if user:
            user.balance = (user.balance or Decimal("0")) + deposit.amount
    deposit.status = body.status
    deposit.note = body.note
    db.commit()
    return success(message=f"Đã cập nhật giao dịch sang trạng thái {body.status}.")


# ---------- Webhook (không auth, xác thực bằng chữ ký) ----------
@router.post("/webhook", summary="Webhook báo có từ ngân hàng/bên thứ 3")
def webhook(body: WebhookPayload, db: Session = Depends(get_db)) -> dict:
    data = service.process_webhook(db, body.reference_code, body.amount, body.signature)
    return success(data, "Đã xử lý webhook.")
