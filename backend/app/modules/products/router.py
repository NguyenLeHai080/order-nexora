"""Router Products — CRUD, áp công thức tính giá bán theo markup."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
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
from app.modules.products.schemas import (
    ApplyMarkupRequest,
    ProductCreate,
    ProductOut,
    ProductUpdate,
)
from app.modules.settings import service as settings_service
from app.modules.suppliers.models import Supplier

router = APIRouter(prefix="/products", tags=["Products"])


def _supplier_names(db: Session, products: list[Product]) -> dict[int, str]:
    """Lookup batch id -> tên NCC cho danh sách product (tránh N+1)."""
    ids = {p.supplier_id for p in products if p.supplier_id is not None}
    if not ids:
        return {}
    rows = db.execute(select(Supplier.id, Supplier.name).where(Supplier.id.in_(ids))).all()
    return {row[0]: row[1] for row in rows}


def _out(p: Product, supplier_names: dict[int, str] | None = None) -> dict:
    data = ProductOut.model_validate(p).model_dump(mode="json")
    if p.supplier_id is not None:
        names = supplier_names if supplier_names is not None else {}
        data["supplier_name"] = names.get(p.supplier_id)
    return data


@router.get("", summary="Danh sách sản phẩm")
def index(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("products.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = ProductRepository(db).paginate(params, organization_id=ctx.organization_id)
    names = _supplier_names(db, items)
    return paginated([_out(i, names) for i in items], total, params.page, params.limit)


@router.post("/apply-markup", summary="Áp markup hàng loạt cho sản phẩm")
def apply_markup(
    body: ApplyMarkupRequest,
    ctx: RequestContext = Depends(require("products.update")),
    db: Session = Depends(get_db),
) -> dict:
    """Đặt giá bán cho nhiều sản phẩm cùng lúc bằng % markup trên giá gốc (NCC).

    Mặc định chỉ áp cho sản phẩm CHƯA từng đặt giá (markup_percent=0 và
    markup_amount=0) — dùng để "kích hoạt lãi" cho catalog vừa đồng bộ về mà giữ
    nguyên giá admin đã chỉnh tay. markup_percent bỏ trống -> dùng default_markup_percent.
    """
    markup = body.markup_percent
    if markup is None:
        markup = settings_service.get_default_markup_percent(db)

    stmt = select(Product)
    if ctx.organization_id is not None:
        stmt = stmt.where(Product.organization_id == ctx.organization_id)
    if body.only_unpriced:
        stmt = stmt.where(
            Product.markup_percent == 0,
            Product.markup_amount == 0,
        )

    products = db.scalars(stmt).all()
    for p in products:
        p.markup_percent = markup
    db.commit()
    return success(
        {"updated": len(products), "markup_percent": str(markup)},
        f"Đã áp markup {markup}% cho {len(products)} sản phẩm.",
    )


@router.get("/{product_id}", summary="Chi tiết sản phẩm")
def show(
    product_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("products.show")),
) -> dict:
    obj = db.get(Product, product_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy sản phẩm.")
    return {"data": _out(obj, _supplier_names(db, [obj])), "success": "true"}


@router.post("", status_code=201, summary="Tạo sản phẩm")
def create(
    body: ProductCreate,
    ctx: RequestContext = Depends(require("products.store")),
    db: Session = Depends(get_db),
) -> dict:
    data = body.model_dump()
    data["slug"] = data.get("slug") or slugify(body.name)
    obj = ProductRepository(db).create(organization_id=ctx.organization_id, **data)
    return {
        "data": _out(obj, _supplier_names(db, [obj])),
        "success": "true",
        "message": "Tạo sản phẩm thành công!",
    }


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
    return {
        "data": _out(obj, _supplier_names(db, [obj])),
        "success": "true",
        "message": "Cập nhật sản phẩm thành công.",
    }


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
