"""Router Content — CRUD Bài viết (Thủ thuật/Tin tức/Chính sách) + FAQ (admin)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import require
from app.modules.content.models import Article, Faq
from app.modules.content.repository import ArticleRepository, FaqRepository
from app.modules.content.schemas import (
    ArticleCreate,
    ArticleOut,
    ArticleUpdate,
    FaqCreate,
    FaqOut,
    FaqUpdate,
)
from app.modules.organizations.utils import slugify

# ─── Articles ──────────────────────────────────────────────────────────────
articles_router = APIRouter(prefix="/articles", tags=["Content"])


def _article_out(a: Article) -> dict:
    return ArticleOut.model_validate(a).model_dump(mode="json")


@articles_router.get("", summary="Danh sách bài viết")
def article_index(
    params: ListParams = Depends(list_params),
    group: str | None = Query(None, description="tips | news | policy"),
    category_key: str | None = Query(None, description="Lọc theo key danh mục"),
    ctx: RequestContext = Depends(require("articles.index")),
    db: Session = Depends(get_db),
) -> dict:
    # Tự query để thêm filter group/category_key ngoài bộ lọc chuẩn.
    stmt = select(Article)
    if ctx.organization_id is not None:
        stmt = stmt.where(Article.organization_id == ctx.organization_id)
    if params.search:
        stmt = stmt.where(Article.title.ilike(f"%{params.search}%"))
    if params.status:
        stmt = stmt.where(Article.status == params.status)
    if group:
        stmt = stmt.where(Article.group == group)
    if category_key and category_key != "all":
        stmt = stmt.where(Article.category_key == category_key)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    sort_col = params.sort_by if params.sort_by in ArticleRepository.sortable else "id"
    col = getattr(Article, sort_col)
    stmt = stmt.order_by(desc(col) if params.sort_order == "desc" else asc(col))
    stmt = stmt.limit(params.limit).offset(params.offset)
    items = list(db.scalars(stmt).all())
    return paginated([_article_out(a) for a in items], total, params.page, params.limit)


@articles_router.get("/{article_id}", summary="Chi tiết bài viết")
def article_show(
    article_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("articles.show")),
) -> dict:
    obj = db.get(Article, article_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy bài viết.")
    return success(_article_out(obj))


@articles_router.post("", status_code=201, summary="Tạo bài viết")
def article_create(
    body: ArticleCreate,
    ctx: RequestContext = Depends(require("articles.store")),
    db: Session = Depends(get_db),
) -> dict:
    data = body.model_dump()
    data["slug"] = data.get("slug") or slugify(body.title)
    obj = ArticleRepository(db).create(organization_id=ctx.organization_id, **data)
    return success(_article_out(obj), message="Tạo bài viết thành công!")


@articles_router.put("/{article_id}", summary="Cập nhật bài viết")
def article_update(
    article_id: int,
    body: ArticleUpdate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("articles.update")),
) -> dict:
    repo = ArticleRepository(db)
    obj = repo.get(article_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy bài viết.")
    obj = repo.update(obj, **body.model_dump(exclude_unset=True))
    return success(_article_out(obj), message="Cập nhật bài viết thành công.")


@articles_router.delete("/{article_id}", summary="Xóa bài viết")
def article_destroy(
    article_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("articles.destroy")),
) -> dict:
    repo = ArticleRepository(db)
    obj = repo.get(article_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy bài viết.")
    repo.delete(obj)
    return success(message="Đã xóa bài viết thành công!")


# ─── FAQ ───────────────────────────────────────────────────────────────────
faqs_router = APIRouter(prefix="/faqs", tags=["Content"])


def _faq_out(f: Faq) -> dict:
    return FaqOut.model_validate(f).model_dump(mode="json")


@faqs_router.get("", summary="Danh sách FAQ")
def faq_index(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("faqs.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = FaqRepository(db).paginate(params, organization_id=ctx.organization_id)
    return paginated([_faq_out(f) for f in items], total, params.page, params.limit)


@faqs_router.get("/{faq_id}", summary="Chi tiết FAQ")
def faq_show(
    faq_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("faqs.show")),
) -> dict:
    obj = db.get(Faq, faq_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy FAQ.")
    return success(_faq_out(obj))


@faqs_router.post("", status_code=201, summary="Tạo FAQ")
def faq_create(
    body: FaqCreate,
    ctx: RequestContext = Depends(require("faqs.store")),
    db: Session = Depends(get_db),
) -> dict:
    obj = FaqRepository(db).create(organization_id=ctx.organization_id, **body.model_dump())
    return success(_faq_out(obj), message="Tạo FAQ thành công!")


@faqs_router.put("/{faq_id}", summary="Cập nhật FAQ")
def faq_update(
    faq_id: int,
    body: FaqUpdate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("faqs.update")),
) -> dict:
    repo = FaqRepository(db)
    obj = repo.get(faq_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy FAQ.")
    obj = repo.update(obj, **body.model_dump(exclude_unset=True))
    return success(_faq_out(obj), message="Cập nhật FAQ thành công.")


@faqs_router.delete("/{faq_id}", summary="Xóa FAQ")
def faq_destroy(
    faq_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("faqs.destroy")),
) -> dict:
    repo = FaqRepository(db)
    obj = repo.get(faq_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy FAQ.")
    repo.delete(obj)
    return success(message="Đã xóa FAQ thành công!")
