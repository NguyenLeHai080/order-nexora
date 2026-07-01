"""Router Vouchers — CRUD mã giảm giá."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import require
from app.modules.vouchers.models import Voucher
from app.modules.vouchers.repository import VoucherRepository
from app.modules.vouchers.schemas import VoucherCreate, VoucherOut, VoucherUpdate
from app.modules.vouchers.service import generate_unique_code

router = APIRouter(prefix="/vouchers", tags=["Billing & Payment"])


def _out(v: Voucher) -> dict:
    return VoucherOut.model_validate(v).model_dump(mode="json")


@router.get("", summary="Danh sách voucher")
def index(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("vouchers.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = VoucherRepository(db).paginate(params, organization_id=ctx.organization_id)
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/{voucher_id}", summary="Chi tiết voucher")
def show(
    voucher_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("vouchers.show")),
) -> dict:
    obj = db.get(Voucher, voucher_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy voucher.")
    return {"data": _out(obj), "success": "true"}


@router.post("", status_code=201, summary="Tạo voucher")
def create(
    body: VoucherCreate,
    ctx: RequestContext = Depends(require("vouchers.store")),
    db: Session = Depends(get_db),
) -> dict:
    data = body.model_dump()
    # Mã bỏ trống -> tự sinh từ mô tả (hoặc ngẫu nhiên), đảm bảo duy nhất.
    code = (data.get("code") or "").strip().upper()
    data["code"] = code or generate_unique_code(db, body.description)
    obj = VoucherRepository(db).create(organization_id=ctx.organization_id, **data)
    return {"data": _out(obj), "success": "true", "message": "Tạo voucher thành công!"}


@router.put("/{voucher_id}", summary="Cập nhật voucher")
def update(
    voucher_id: int,
    body: VoucherUpdate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("vouchers.update")),
) -> dict:
    repo = VoucherRepository(db)
    obj = repo.get(voucher_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy voucher.")
    obj = repo.update(obj, **body.model_dump(exclude_unset=True))
    return {"data": _out(obj), "success": "true", "message": "Cập nhật voucher thành công."}


@router.delete("/{voucher_id}", summary="Xóa voucher")
def destroy(
    voucher_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("vouchers.destroy")),
) -> dict:
    repo = VoucherRepository(db)
    obj = repo.get(voucher_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy voucher.")
    repo.delete(obj)
    return success(message="Đã xóa voucher thành công!")
