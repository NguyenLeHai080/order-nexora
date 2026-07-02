"""Service cho Engagement — verified-purchase, rating summary, submit, moderation.

Tách logic nghiệp vụ khỏi router: kiểm tra đã mua, chặn review trùng, dựng
bản ghi pending, tổng hợp rating. Query đều ghim public_org_id (landing không
có RequestContext/header tổ chức).
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, ForbiddenError, NotFoundError
from app.modules.engagement.models import Engagement
from app.modules.orders.models import Order
from app.modules.settings import service as settings_service


def _public_org_id(db: Session) -> int:
    org_id = settings_service.get_public_org_id(db)
    if org_id is None:
        raise NotFoundError("Hệ thống chưa sẵn sàng nhận tương tác.")
    return org_id


def has_purchased(db: Session, user_id: int, product_id: int, org_id: int) -> bool:
    """User đã mua sản phẩm khi có ít nhất một đơn success khớp product_id."""
    count = (
        db.scalar(
            select(func.count())
            .select_from(Order)
            .where(
                Order.user_id == user_id,
                Order.product_id == product_id,
                Order.status == "success",
                Order.organization_id == org_id,
            )
        )
        or 0
    )
    return count > 0


def rating_summary(db: Session, product_id: int, org_id: int | None = None) -> dict:
    """Sao trung bình + số lượt (chỉ review đã duyệt)."""
    if org_id is None:
        org_id = settings_service.get_public_org_id(db)
    if org_id is None:
        return {"average": 0, "count": 0}
    row = db.execute(
        select(func.avg(Engagement.rating), func.count(Engagement.id)).where(
            Engagement.organization_id == org_id,
            Engagement.kind == "review",
            Engagement.target_type == "product",
            Engagement.target_id == product_id,
            Engagement.status == "approved",
        )
    ).one()
    avg, count = row
    return {"average": round(float(avg), 1) if avg is not None else 0, "count": int(count or 0)}


def submit_review(
    db: Session,
    *,
    product_id: int,
    user_id: int,
    author_name: str,
    rating: int,
    title: str | None,
    content: str,
) -> Engagement:
    """Tạo đánh giá (pending). Bắt buộc đã mua + chưa đánh giá sản phẩm này."""
    org_id = _public_org_id(db)

    if not has_purchased(db, user_id, product_id, org_id):
        raise ForbiddenError("Chỉ khách đã mua sản phẩm mới được đánh giá.")

    existed = db.scalar(
        select(Engagement.id).where(
            Engagement.organization_id == org_id,
            Engagement.kind == "review",
            Engagement.target_type == "product",
            Engagement.target_id == product_id,
            Engagement.user_id == user_id,
        )
    )
    if existed is not None:
        raise AppException("Bạn đã đánh giá sản phẩm này rồi.")

    return _create(
        db,
        kind="review",
        target_type="product",
        target_id=product_id,
        rating=rating,
        title=title,
        content=content,
        author_name=author_name,
        user_id=user_id,
        is_verified_purchase=True,
        org_id=org_id,
    )


def submit_comment(
    db: Session,
    *,
    article_id: int,
    author_name: str,
    author_email: str | None,
    content: str,
    user_id: int | None = None,
) -> Engagement:
    """Bình luận bài viết (pending). Cho phép khách vãng lai."""
    org_id = _public_org_id(db)
    return _create(
        db,
        kind="comment",
        target_type="article",
        target_id=article_id,
        content=content,
        author_name=author_name,
        author_email=author_email,
        user_id=user_id,
        org_id=org_id,
    )


def submit_testimonial(
    db: Session,
    *,
    author_name: str,
    author_email: str | None,
    content: str,
    rating: int | None = None,
    user_id: int | None = None,
) -> Engagement:
    """Cảm nhận trang chủ (pending). Cho phép khách vãng lai."""
    org_id = _public_org_id(db)
    return _create(
        db,
        kind="testimonial",
        target_type="site",
        target_id=None,
        rating=rating,
        content=content,
        author_name=author_name,
        author_email=author_email,
        user_id=user_id,
        org_id=org_id,
    )


def submit_discussion(
    db: Session,
    *,
    product_id: int,
    article_id: int | None,
    author_name: str,
    author_email: str | None,
    content: str,
    user_id: int | None = None,
) -> Engagement:
    """Trao đổi theo sản phẩm (pending). Cho phép khách vãng lai."""
    org_id = _public_org_id(db)
    return _create(
        db,
        kind="discussion",
        target_type="product",
        target_id=product_id,
        title=str(article_id) if article_id else None,  # gắn bài viết liên quan (nếu có)
        content=content,
        author_name=author_name,
        author_email=author_email,
        user_id=user_id,
        org_id=org_id,
    )


def _create(db: Session, *, org_id: int, **fields) -> Engagement:
    obj = Engagement(status="pending", organization_id=org_id, **fields)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_public(
    db: Session,
    *,
    kind: str,
    target_type: str,
    target_id: int | None,
    page: int,
    limit: int,
) -> tuple[list[Engagement], int]:
    """Danh sách tương tác ĐÃ DUYỆT cho một target (public)."""
    org_id = settings_service.get_public_org_id(db)
    if org_id is None:
        return [], 0
    stmt = select(Engagement).where(
        Engagement.organization_id == org_id,
        Engagement.kind == kind,
        Engagement.target_type == target_type,
        Engagement.status == "approved",
    )
    if target_id is not None:
        stmt = stmt.where(Engagement.target_id == target_id)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Engagement.created_at.desc()).offset((page - 1) * limit).limit(limit)
    return list(db.scalars(stmt).all()), total


def set_status(db: Session, engagement_id: int, status: str) -> Engagement:
    obj = db.get(Engagement, engagement_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy tương tác.")
    obj.status = status
    db.commit()
    db.refresh(obj)
    return obj


def set_reply(db: Session, engagement_id: int, reply: str, admin_user_id: int | None) -> Engagement:
    obj = db.get(Engagement, engagement_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy tương tác.")
    obj.admin_reply = reply
    obj.admin_reply_at = datetime.now(UTC)
    obj.admin_reply_by = admin_user_id
    db.commit()
    db.refresh(obj)
    return obj
