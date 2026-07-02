"""Schemas cho module Engagement — admin quản lý + public submit/list."""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

# ─── Public submit (input) ───────────────────────────────────────────────────


class ReviewCreate(BaseModel):
    """Đánh giá sản phẩm — yêu cầu đăng nhập + đã mua (kiểm ở service)."""

    rating: int = Field(..., ge=1, le=5)
    title: str | None = Field(None, max_length=255)
    content: str = Field(..., min_length=2, max_length=2000)


class CommentCreate(BaseModel):
    """Bình luận bài viết — cho phép khách vãng lai."""

    author_name: str = Field(..., min_length=2, max_length=120)
    author_email: EmailStr | None = None
    content: str = Field(..., min_length=2, max_length=2000)


class TestimonialCreate(BaseModel):
    """Cảm nhận trang chủ — cho phép khách vãng lai."""

    author_name: str = Field(..., min_length=2, max_length=120)
    author_email: EmailStr | None = None
    content: str = Field(..., min_length=2, max_length=2000)
    rating: int | None = Field(None, ge=1, le=5)


class DiscussionCreate(BaseModel):
    """Trao đổi/thảo luận theo sản phẩm — cho phép khách vãng lai."""

    author_name: str = Field(..., min_length=2, max_length=120)
    author_email: EmailStr | None = None
    content: str = Field(..., min_length=2, max_length=2000)
    article_id: int | None = None


# ─── Admin actions ───────────────────────────────────────────────────────────


class ReplyBody(BaseModel):
    admin_reply: str = Field(..., min_length=1, max_length=2000)


# ─── Output ──────────────────────────────────────────────────────────────────


class PublicEngagementOut(BaseModel):
    """Bản công khai — KHÔNG lộ author_email/user_id/status/organization_id."""

    id: int
    author_name: str
    rating: int | None = None
    title: str | None = None
    content: str
    is_verified_purchase: bool = False
    admin_reply: str | None = None
    admin_reply_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class EngagementAdminOut(BaseModel):
    """Bản đầy đủ cho admin."""

    id: int
    kind: str
    target_type: str
    target_id: int | None
    rating: int | None
    title: str | None
    content: str
    author_name: str
    author_email: str | None
    user_id: int | None
    is_verified_purchase: bool
    status: str
    admin_reply: str | None
    admin_reply_at: datetime | None
    admin_reply_by: int | None
    organization_id: int | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}
