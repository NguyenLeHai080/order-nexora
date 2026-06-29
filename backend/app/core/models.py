"""Mixin dùng chung cho ORM model: khóa chính, timestamps, audit, multi-org."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """created_at / updated_at tự động."""

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PKMixin:
    """Khóa chính tự tăng."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)


class OrgScopedMixin:
    """Gắn bản ghi với một organization (multi-tenant theo tổ chức)."""

    organization_id: Mapped[int | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True
    )
