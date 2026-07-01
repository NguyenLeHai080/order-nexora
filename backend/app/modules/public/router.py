"""Router Public — API đọc công khai cho landing page (KHÔNG auth).

Xem cảnh báo bảo mật ở `app.modules.public.__init__`. Tất cả query đều ghim
`organization_id == public_org_id` và `status == "active"`; danh mục/sản phẩm
inactive hoặc thuộc org khác không bao giờ lộ ra.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.response import paginated, success
from app.modules.categories.models import Category
from app.modules.content.models import Article, Faq
from app.modules.products.models import Product
from app.modules.public.schemas import (
    PublicArticleOut,
    PublicCategoryOut,
    PublicFaqOut,
    PublicProductOut,
)
from app.modules.settings import service as settings_service

router = APIRouter(prefix="/public", tags=["Public"])


def _product_out(p: Product) -> dict:
    """Map Product -> dict công khai (chỉ trường an toàn)."""
    return PublicProductOut(
        id=p.id,
        name=p.name,
        slug=p.slug,
        description=p.description,
        name_en=p.name_en,
        category_id=p.category_id,
        category_name=p.category_name,
        image_url=p.image_url,
        price=p.sale_price,
        regular_price=p.regular_price,
        delivery_type=p.delivery_type,
        warranty_days=p.warranty_days,
        stock_status=p.stock_status,
        sold_count=p.sold_count,
        created_at=p.created_at,
    ).model_dump(mode="json")


def _article_out(a: Article, *, include_content: bool = False) -> dict:
    """Map Article -> dict công khai. `content` (thân bài) chỉ trả khi xem chi tiết."""
    return PublicArticleOut(
        id=a.id,
        title=a.title,
        slug=a.slug,
        category=a.category,
        category_key=a.category_key,
        group=a.group,
        author=a.author,
        excerpt=a.excerpt,
        image_url=a.image_url,
        published_at=a.published_at or a.created_at,
        content=a.content if include_content else None,
    ).model_dump(mode="json")


@router.get("/products", summary="[Public] Danh sách sản phẩm hiển thị trên landing")
def list_products(
    db: Session = Depends(get_db),
    search: str | None = Query(None, description="Từ khóa tìm theo tên"),
    category_id: int | None = Query(None, description="Lọc theo danh mục"),
    sort: str = Query("popular", pattern="^(popular|newest)$", description="popular | newest"),
    limit: int = Query(24, ge=1, le=100),
    page: int = Query(1, ge=1),
) -> dict:
    org_id = settings_service.get_public_org_id(db)
    if org_id is None:
        return paginated([], 0, page, limit)

    stmt = select(Product).where(
        Product.organization_id == org_id,
        Product.status == "active",
    )
    if search:
        stmt = stmt.where(Product.name.ilike(f"%{search}%"))
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    if sort == "newest":
        stmt = stmt.order_by(Product.created_at.desc())
    else:
        stmt = stmt.order_by(Product.sold_count.desc(), Product.created_at.desc())

    stmt = stmt.offset((page - 1) * limit).limit(limit)
    items = db.scalars(stmt).all()
    return paginated([_product_out(p) for p in items], total, page, limit)


@router.get("/products/{slug}", summary="[Public] Chi tiết sản phẩm theo slug")
def get_product(slug: str, db: Session = Depends(get_db)) -> dict:
    org_id = settings_service.get_public_org_id(db)
    obj = None
    if org_id is not None:
        obj = db.scalars(
            select(Product).where(
                Product.organization_id == org_id,
                Product.status == "active",
                Product.slug == slug,
            )
        ).first()
    if obj is None:
        raise NotFoundError("Không tìm thấy sản phẩm.")
    return success(_product_out(obj))


@router.get("/categories", summary="[Public] Danh mục sản phẩm (có sản phẩm active)")
def list_categories(db: Session = Depends(get_db)) -> dict:
    org_id = settings_service.get_public_org_id(db)
    if org_id is None:
        return success([])

    # Đếm sản phẩm active theo danh mục để FE dựng tab/nhóm.
    counts = dict(
        db.execute(
            select(Product.category_id, func.count(Product.id))
            .where(
                Product.organization_id == org_id,
                Product.status == "active",
                Product.category_id.isnot(None),
            )
            .group_by(Product.category_id)
        ).all()
    )

    cats = db.scalars(
        select(Category)
        .where(
            Category.organization_id == org_id,
            Category.status == "active",
        )
        .order_by(Category.sort_order.asc(), Category.name.asc())
    ).all()

    out = [
        PublicCategoryOut(
            id=c.id,
            name=c.name,
            slug=c.slug,
            description=c.description,
            product_count=counts.get(c.id, 0),
        ).model_dump(mode="json")
        for c in cats
        if counts.get(c.id, 0) > 0
    ]
    return success(out)


@router.get("/articles", summary="[Public] Danh sách bài viết (Thủ thuật/Tin tức)")
def list_articles(
    db: Session = Depends(get_db),
    group: str | None = Query(None, pattern="^(tips|news)$", description="tips | news"),
    category_key: str | None = Query(None, description="Lọc theo key danh mục (all = bỏ qua)"),
    limit: int = Query(24, ge=1, le=100),
    page: int = Query(1, ge=1),
) -> dict:
    org_id = settings_service.get_public_org_id(db)
    if org_id is None:
        return paginated([], 0, page, limit)

    stmt = select(Article).where(
        Article.organization_id == org_id,
        Article.status == "active",
    )
    if group:
        stmt = stmt.where(Article.group == group)
    if category_key and category_key != "all":
        stmt = stmt.where(Article.category_key == category_key)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    stmt = (
        stmt.order_by(Article.sort_order.asc(), Article.published_at.desc().nullslast())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    items = db.scalars(stmt).all()
    return paginated([_article_out(a) for a in items], total, page, limit)


@router.get("/articles/{slug}", summary="[Public] Chi tiết bài viết theo slug")
def get_article(slug: str, db: Session = Depends(get_db)) -> dict:
    org_id = settings_service.get_public_org_id(db)
    obj = None
    if org_id is not None:
        obj = db.scalars(
            select(Article).where(
                Article.organization_id == org_id,
                Article.status == "active",
                Article.slug == slug,
            )
        ).first()
    if obj is None:
        raise NotFoundError("Không tìm thấy bài viết.")

    # Bài liên quan: cùng group, khác id, tối đa 3 bài mới nhất.
    related = db.scalars(
        select(Article)
        .where(
            Article.organization_id == org_id,
            Article.status == "active",
            Article.group == obj.group,
            Article.id != obj.id,
        )
        .order_by(Article.sort_order.asc(), Article.published_at.desc().nullslast())
        .limit(3)
    ).all()

    data = _article_out(obj, include_content=True)
    data["related"] = [_article_out(r) for r in related]
    return success(data)


@router.get("/faqs", summary="[Public] Danh sách câu hỏi thường gặp")
def list_faqs(db: Session = Depends(get_db)) -> dict:
    org_id = settings_service.get_public_org_id(db)
    if org_id is None:
        return success([])

    rows = db.scalars(
        select(Faq)
        .where(Faq.organization_id == org_id, Faq.status == "active")
        .order_by(Faq.sort_order.asc(), Faq.id.asc())
    ).all()
    out = [
        PublicFaqOut(id=f.id, question=f.question, answer=f.answer).model_dump(mode="json")
        for f in rows
    ]
    return success(out)
