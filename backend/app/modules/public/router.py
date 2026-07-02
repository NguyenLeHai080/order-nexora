"""Router Public — API đọc công khai cho landing page (KHÔNG auth).

Xem cảnh báo bảo mật ở `app.modules.public.__init__`. Tất cả query đều ghim
`organization_id == public_org_id` và `status == "active"`; danh mục/sản phẩm
inactive hoặc thuộc org khác không bao giờ lộ ra.
"""
from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.response import paginated, success
from app.core.security import decode_access_token
from app.modules.auth.dependencies import get_current_user
from app.modules.categories.models import Category
from app.modules.content.models import Article, Faq
from app.modules.engagement import service as engagement_service
from app.modules.engagement.schemas import (
    CommentCreate,
    DiscussionCreate,
    PublicEngagementOut,
    ReviewCreate,
    TestimonialCreate,
)
from app.modules.orders import service as order_service
from app.modules.orders.models import Order
from app.modules.orders.schemas import GuestOrderCreate, OrderCustomerOut
from app.modules.payments import service as payment_service
from app.modules.payments.models import BankAccount
from app.modules.products.models import Product
from app.modules.public.schemas import (
    PublicArticleOut,
    PublicCategoryOut,
    PublicFaqOut,
    PublicProductOut,
)
from app.modules.settings import service as settings_service
from app.modules.users.models import User

router = APIRouter(prefix="/public", tags=["Public"])

_bearer_optional = HTTPBearer(auto_error=False)


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_optional),
    db: Session = Depends(get_db),
) -> User | None:
    """Trả về User nếu có Bearer token hợp lệ, ngược lại None (cho phép ẩn danh)."""
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None
    return db.get(User, int(payload["sub"]))


def _engagement_out(e) -> dict:  # noqa: ANN001
    return PublicEngagementOut.model_validate(e).model_dump(mode="json")


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
        Product.show_on_landing.is_(True),
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
                Product.show_on_landing.is_(True),
                Product.slug == slug,
            )
        ).first()
    if obj is None:
        raise NotFoundError("Không tìm thấy sản phẩm.")
    data = _product_out(obj)
    data["rating"] = engagement_service.rating_summary(db, obj.id, org_id)
    return success(data)


@router.get("/categories", summary="[Public] Danh mục sản phẩm (có sản phẩm active)")
def list_categories(db: Session = Depends(get_db)) -> dict:
    org_id = settings_service.get_public_org_id(db)
    if org_id is None:
        return success([])

    # Đếm sản phẩm active + hiện landing theo danh mục để FE dựng tab/nhóm.
    counts = dict(
        db.execute(
            select(Product.category_id, func.count(Product.id))
            .where(
                Product.organization_id == org_id,
                Product.status == "active",
                Product.show_on_landing.is_(True),
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
            Category.show_on_landing.is_(True),
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


@router.get("/articles", summary="[Public] Danh sách bài viết (Thủ thuật/Tin tức/Chính sách)")
def list_articles(
    db: Session = Depends(get_db),
    group: str | None = Query(None, pattern="^(tips|news|policy)$", description="tips | news | policy"),
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
        Article.show_on_landing.is_(True),
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
                Article.show_on_landing.is_(True),
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
            Article.show_on_landing.is_(True),
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
        .where(
            Faq.organization_id == org_id,
            Faq.status == "active",
            Faq.show_on_landing.is_(True),
        )
        .order_by(Faq.sort_order.asc(), Faq.id.asc())
    ).all()
    out = [
        PublicFaqOut(id=f.id, question=f.question, answer=f.answer).model_dump(mode="json")
        for f in rows
    ]
    return success(out)


# ─── Engagement: submit (gửi tương tác) ──────────────────────────────────────


@router.post("/products/{product_id}/reviews", status_code=201, summary="[Public] Gửi đánh giá sản phẩm")
def submit_review(
    product_id: int,
    body: ReviewCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    engagement_service.submit_review(
        db,
        product_id=product_id,
        user_id=user.id,
        author_name=user.name,
        rating=body.rating,
        title=body.title,
        content=body.content,
    )
    return success(message="Cảm ơn bạn! Đánh giá đang chờ duyệt.")


@router.post("/articles/{article_id}/comments", status_code=201, summary="[Public] Gửi bình luận bài viết")
def submit_comment(
    article_id: int,
    body: CommentCreate,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    engagement_service.submit_comment(
        db,
        article_id=article_id,
        author_name=user.name if user else body.author_name,
        author_email=body.author_email,
        content=body.content,
        user_id=user.id if user else None,
    )
    return success(message="Cảm ơn bạn! Bình luận đang chờ duyệt.")


@router.post("/testimonials", status_code=201, summary="[Public] Gửi cảm nhận")
def submit_testimonial(
    body: TestimonialCreate,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    engagement_service.submit_testimonial(
        db,
        author_name=user.name if user else body.author_name,
        author_email=body.author_email,
        content=body.content,
        rating=body.rating,
        user_id=user.id if user else None,
    )
    return success(message="Cảm ơn cảm nhận của bạn! Nội dung đang chờ duyệt.")


@router.post(
    "/products/{product_id}/discussions",
    status_code=201,
    summary="[Public] Gửi trao đổi theo sản phẩm",
)
def submit_discussion(
    product_id: int,
    body: DiscussionCreate,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    engagement_service.submit_discussion(
        db,
        product_id=product_id,
        article_id=body.article_id,
        author_name=user.name if user else body.author_name,
        author_email=body.author_email,
        content=body.content,
        user_id=user.id if user else None,
    )
    return success(message="Cảm ơn bạn! Nội dung đang chờ duyệt.")


# ─── Engagement: list (đã duyệt) ─────────────────────────────────────────────


@router.get("/products/{product_id}/reviews", summary="[Public] Đánh giá đã duyệt của sản phẩm")
def list_reviews(
    product_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
) -> dict:
    items, total = engagement_service.list_public(
        db, kind="review", target_type="product", target_id=product_id, page=page, limit=limit
    )
    resp = paginated([_engagement_out(e) for e in items], total, page, limit)
    resp["summary"] = engagement_service.rating_summary(db, product_id)
    return resp


@router.get("/products/{product_id}/rating", summary="[Public] Sao trung bình sản phẩm")
def product_rating(product_id: int, db: Session = Depends(get_db)) -> dict:
    return success(engagement_service.rating_summary(db, product_id))


@router.get("/articles/{article_id}/comments", summary="[Public] Bình luận đã duyệt của bài viết")
def list_comments(
    article_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
) -> dict:
    items, total = engagement_service.list_public(
        db, kind="comment", target_type="article", target_id=article_id, page=page, limit=limit
    )
    return paginated([_engagement_out(e) for e in items], total, page, limit)


@router.get("/testimonials", summary="[Public] Cảm nhận đã duyệt (trang chủ)")
def list_testimonials(
    db: Session = Depends(get_db),
    limit: int = Query(12, ge=1, le=50),
) -> dict:
    items, _ = engagement_service.list_public(
        db, kind="testimonial", target_type="site", target_id=None, page=1, limit=limit
    )
    return success([_engagement_out(e) for e in items])


@router.get("/products/{product_id}/discussions", summary="[Public] Trao đổi đã duyệt theo sản phẩm")
def list_discussions(
    product_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
) -> dict:
    items, total = engagement_service.list_public(
        db, kind="discussion", target_type="product", target_id=product_id, page=page, limit=limit
    )
    return paginated([_engagement_out(e) for e in items], total, page, limit)


# ─── Guest checkout (mua không cần đăng nhập) ────────────────────────────────


def _customer_out(o: Order) -> dict:
    return OrderCustomerOut.model_validate(o).model_dump(mode="json")


@router.post("/guest-orders", status_code=201, summary="[Public] Đặt đơn khách vãng lai (trả QR)")
def create_guest_order(body: GuestOrderCreate, db: Session = Depends(get_db)) -> dict:
    """Khách chưa đăng nhập đặt đơn: tạo đơn awaiting_payment + sinh QR chuyển khoản.

    Đơn CHƯA thu tiền; sau khi khách chuyển khoản, webhook/nút admin sẽ đánh dấu
    đã thanh toán và kích hoạt xử lý. KHÔNG lộ giá vốn/lãi trong response.
    """
    if not settings_service.get_bool(db, settings_service.GUEST_CHECKOUT_ENABLED_KEY, False):
        raise NotFoundError("Tính năng mua không cần đăng nhập chưa được bật.")

    items = [{"product_id": it.product_id, "quantity": it.quantity} for it in body.items]
    contact = {"name": body.name, "phone": body.phone, "email": body.email}
    result = order_service.create_guest_orders(db, items, contact)

    # Sinh QR VietQR cho tổng tiền (tự chọn ngân hàng active đầu tiên như create_deposit).
    total = result["total"]
    reference = result["reference"]
    bank = db.scalars(
        select(BankAccount).where(BankAccount.status == "active").order_by(BankAccount.id.asc())
    ).first()
    qr_url = payment_service.build_vietqr_url(bank, total, reference) if bank else None

    return success(
        {
            "reference": reference,
            "lookup_token": result["lookup_token"],
            "total": str(total),
            "qr_url": qr_url,
            "bank": (
                {
                    "bank_name": bank.bank_name,
                    "account_number": bank.account_number,
                    "account_holder": bank.account_holder,
                }
                if bank
                else None
            ),
            "orders": [_customer_out(o) for o in result["orders"]],
        },
        "Đã tạo đơn. Vui lòng chuyển khoản theo mã để hoàn tất.",
    )


@router.get("/orders/lookup", summary="[Public] Tra cứu đơn bằng mã + token")
def lookup_order(
    code: str = Query(..., description="Mã đơn hoặc mã thanh toán"),
    token: str = Query(..., description="Token tra cứu bí mật"),
    db: Session = Depends(get_db),
) -> dict:
    """Tra cứu đơn khách vãng lai theo mã + lookup_token (sai token => 404).

    Chấp nhận cả mã đơn (code) lẫn mã thanh toán (payment_reference); token phải
    khớp. Trả toàn bộ đơn cùng lô (chung payment_reference) để khách xem một lần.
    """
    order = db.scalars(
        select(Order).where(
            (Order.code == code) | (Order.payment_reference == code),
            Order.lookup_token == token,
        )
    ).first()
    if order is None or not token:
        raise NotFoundError("Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã và token.")

    batch = list(
        db.scalars(
            select(Order).where(
                Order.payment_reference == order.payment_reference,
                Order.lookup_token == token,
            ).order_by(Order.id.asc())
        ).all()
    ) if order.payment_reference else [order]

    return success(
        {
            "reference": order.payment_reference,
            "orders": [_customer_out(o) for o in batch],
        }
    )
