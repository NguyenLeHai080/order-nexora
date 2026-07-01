"""Models cho module Content — Article (Thủ thuật/Tin tức) + Faq.

Nội dung biên tập org-scoped phục vụ landing. Không có trường giá/biên lợi nhuận.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class Article(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    """Bài viết Thủ thuật / Tin tức hiển thị trên landing."""

    __tablename__ = "articles"

    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), index=True)
    # Nhãn danh mục hiển thị trên card (vd "Thủ thuật AI").
    category: Mapped[str] = mapped_column(String(120), default="")
    # key danh mục để lọc tab trên FE (vd "ai" | "domain" | "vps" | "tech").
    category_key: Mapped[str] = mapped_column(String(60), default="all", index=True)
    # Nhóm trang: tips | news (quyết định listing + breadcrumb + bài liên quan).
    group: Mapped[str] = mapped_column(String(20), default="tips", index=True)
    author: Mapped[str | None] = mapped_column(String(120), nullable=True)
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Ảnh thumbnail (URL ngoài hoặc upload nội bộ).
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Thân bài HTML (render bằng dangerouslySetInnerHTML trên trang chi tiết).
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Ngày đăng (hiển thị trên card). Tách khỏi created_at để admin chỉnh được.
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)


class Faq(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    """Câu hỏi thường gặp (FAQ) hiển thị trên landing."""

    __tablename__ = "faqs"

    question: Mapped[str] = mapped_column(String(500), nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
