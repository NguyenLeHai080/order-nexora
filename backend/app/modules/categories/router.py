"""Router Categories — CRUD danh mục sản phẩm."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import require
from app.modules.categories.models import Category
from app.modules.categories.repository import CategoryRepository
from app.modules.categories.schemas import CategoryCreate, CategoryOut, CategoryUpdate
from app.modules.organizations.utils import slugify
from app.modules.products.models import Product

router = APIRouter(prefix="/categories", tags=["Products"])


def _product_counts(db: Session, categories: list[Category]) -> dict[int, int]:
    """Đếm số sản phẩm theo từng category (tránh N+1)."""
    ids = [c.id for c in categories]
    if not ids:
        return {}
    rows = db.execute(
        select(Product.category_id, func.count(Product.id))
        .where(Product.category_id.in_(ids))
        .group_by(Product.category_id)
    ).all()
    return {row[0]: row[1] for row in rows}


def _out(c: Category, counts: dict[int, int] | None = None) -> dict:
    data = CategoryOut.model_validate(c).model_dump(mode="json")
    data["product_count"] = (counts or {}).get(c.id, 0)
    return data


@router.get("", summary="Danh sách danh mục")
def index(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("categories.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = CategoryRepository(db).paginate(params, organization_id=ctx.organization_id)
    counts = _product_counts(db, items)
    return paginated([_out(i, counts) for i in items], total, params.page, params.limit)


@router.get("/{category_id}", summary="Chi tiết danh mục")
def show(
    category_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("categories.show")),
) -> dict:
    obj = db.get(Category, category_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy danh mục.")
    return {"data": _out(obj, _product_counts(db, [obj])), "success": "true"}


@router.post("", status_code=201, summary="Tạo danh mục")
def create(
    body: CategoryCreate,
    ctx: RequestContext = Depends(require("categories.store")),
    db: Session = Depends(get_db),
) -> dict:
    data = body.model_dump()
    data["slug"] = data.get("slug") or slugify(body.name)
    obj = CategoryRepository(db).create(organization_id=ctx.organization_id, **data)
    return {"data": _out(obj), "success": "true", "message": "Tạo danh mục thành công!"}


@router.put("/{category_id}", summary="Cập nhật danh mục")
def update(
    category_id: int,
    body: CategoryUpdate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("categories.update")),
) -> dict:
    repo = CategoryRepository(db)
    obj = repo.get(category_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy danh mục.")
    obj = repo.update(obj, **body.model_dump(exclude_unset=True))
    return {"data": _out(obj, _product_counts(db, [obj])), "success": "true", "message": "Cập nhật danh mục thành công."}


@router.delete("/{category_id}", summary="Xóa danh mục")
def destroy(
    category_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("categories.destroy")),
) -> dict:
    repo = CategoryRepository(db)
    obj = repo.get(category_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy danh mục.")
    repo.delete(obj)
    return success(message="Đã xóa danh mục thành công!")
