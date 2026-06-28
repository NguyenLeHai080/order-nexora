"""Router Products — CRUD, áp công thức tính giá bán theo markup."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import require
from app.modules.organizations.utils import slugify
from app.modules.products.models import Product
from app.modules.products.repository import ProductRepository
from app.modules.products.schemas import ProductCreate, ProductOut, ProductUpdate

router = APIRouter(prefix="/products", tags=["Products"])


def _out(p: Product) -> dict:
    return ProductOut.model_validate(p).model_dump(mode="json")


@router.get("", summary="Danh sách sản phẩm")
def index(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("products.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = ProductRepository(db).paginate(params, organization_id=ctx.organization_id)
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/{product_id}", summary="Chi tiết sản phẩm")
def show(
    product_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("products.show")),
) -> dict:
    obj = db.get(Product, product_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy sản phẩm.")
    return {"data": _out(obj), "success": "true"}


@router.post("", status_code=201, summary="Tạo sản phẩm")
def create(
    body: ProductCreate,
    ctx: RequestContext = Depends(require("products.store")),
    db: Session = Depends(get_db),
) -> dict:
    data = body.model_dump()
    data["slug"] = data.get("slug") or slugify(body.name)
    obj = ProductRepository(db).create(organization_id=ctx.organization_id, **data)
    return {"data": _out(obj), "success": "true", "message": "Tạo sản phẩm thành công!"}


@router.put("/{product_id}", summary="Cập nhật sản phẩm / công thức giá")
def update(
    product_id: int,
    body: ProductUpdate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("products.update")),
) -> dict:
    repo = ProductRepository(db)
    obj = repo.get(product_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy sản phẩm.")
    obj = repo.update(obj, **body.model_dump(exclude_unset=True))
    return {"data": _out(obj), "success": "true", "message": "Cập nhật sản phẩm thành công."}


@router.delete("/{product_id}", summary="Xóa sản phẩm")
def destroy(
    product_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("products.destroy")),
) -> dict:
    repo = ProductRepository(db)
    obj = repo.get(product_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy sản phẩm.")
    repo.delete(obj)
    return success(message="Đã xóa sản phẩm thành công!")
