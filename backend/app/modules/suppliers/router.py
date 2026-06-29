"""Router Suppliers — CRUD cấu hình nhà cung cấp + cấu hình API affiliate."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.integrations import registry
from app.modules.auth.dependencies import require
from app.modules.suppliers.models import Supplier
from app.modules.suppliers.repository import SupplierRepository
from app.modules.suppliers.schemas import SupplierCreate, SupplierOut, SupplierUpdate

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


def _configured_map(s: Supplier) -> dict[str, bool]:
    """Map field cấu hình (theo descriptor driver) đã có giá trị hay chưa.

    Field lấy từ descriptor.fields; giá trị được tìm trong cột JSON `config`
    trước, fallback sang thuộc tính cùng tên trên Supplier (tương thích cột cũ
    của vdstore). Không bao giờ trả giá trị thật — chỉ trả bool.
    """
    if not registry.is_registered(s.driver):
        return {}
    cfg = s.config or {}
    result: dict[str, bool] = {}
    for field in registry.descriptor(s.driver).fields:
        value = cfg.get(field.key)
        if value is None:
            value = getattr(s, field.key, None)
        result[field.key] = bool(value)
    return result


def _out(s: Supplier) -> dict:
    data = SupplierOut.model_validate(s).model_dump(mode="json")
    # Cờ cho FE biết key/secret đã cấu hình chưa (không lộ giá trị thật).
    data["has_api_key_test"] = bool(s.api_key_test or s.api_key)
    data["has_api_key_live"] = bool(s.api_key_live)
    data["has_webhook_secret_test"] = bool(s.webhook_secret_test)
    data["has_webhook_secret_live"] = bool(s.webhook_secret_live)
    data["configured"] = _configured_map(s)
    return data


@router.get("", summary="Danh sách nhà cung cấp")
def index(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("suppliers.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = SupplierRepository(db).paginate(params, organization_id=ctx.organization_id)
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/{supplier_id}", summary="Chi tiết nhà cung cấp")
def show(
    supplier_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("suppliers.show")),
) -> dict:
    obj = db.get(Supplier, supplier_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy nhà cung cấp.")
    return {"data": _out(obj), "success": "true"}


@router.post("", status_code=201, summary="Tạo nhà cung cấp")
def create(
    body: SupplierCreate,
    ctx: RequestContext = Depends(require("suppliers.store")),
    db: Session = Depends(get_db),
) -> dict:
    obj = SupplierRepository(db).create(organization_id=ctx.organization_id, **body.model_dump())
    return {"data": _out(obj), "success": "true", "message": "Tạo nhà cung cấp thành công!"}


@router.put("/{supplier_id}", summary="Cập nhật nhà cung cấp")
def update(
    supplier_id: int,
    body: SupplierUpdate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("suppliers.update")),
) -> dict:
    repo = SupplierRepository(db)
    obj = repo.get(supplier_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy nhà cung cấp.")
    obj = repo.update(obj, **body.model_dump(exclude_unset=True))
    return {"data": _out(obj), "success": "true", "message": "Cập nhật nhà cung cấp thành công."}


@router.delete("/{supplier_id}", summary="Xóa nhà cung cấp")
def destroy(
    supplier_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("suppliers.destroy")),
) -> dict:
    repo = SupplierRepository(db)
    obj = repo.get(supplier_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy nhà cung cấp.")
    repo.delete(obj)
    return success(message="Đã xóa nhà cung cấp thành công!")
