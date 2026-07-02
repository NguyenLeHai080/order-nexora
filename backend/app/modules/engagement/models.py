"""Model Engagement — một bảng đa hình cho review/comment/testimonial/discussion."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class Engagement(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    """Tương tác khách trên landing (đa hình theo `kind` + `target_type`)."""

    __tablename__ = "engagements"

    # review | comment | testimonial | discussion
    kind: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    # product | article | site (site = testimonial trang chủ, target_id NULL)
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)
    target_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # 1..5, chỉ dùng cho review (validate ở service).
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Tác giả: khách vãng lai nhập tay; user đăng nhập lấy user.name + user_id.
    author_name: Mapped[str] = mapped_column(String(120), nullable=False)
    author_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # True khi review có đơn thành công khớp sản phẩm.
    is_verified_purchase: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # pending | approved | rejected
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)

    # Admin trả lời / cảm ơn.
    admin_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_reply_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    admin_reply_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        Index(
            "ix_engagements_public",
            "organization_id",
            "kind",
            "target_type",
            "target_id",
            "status",
        ),
    )
