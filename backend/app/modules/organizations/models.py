"""Model Organization — tổ chức/đại lý, có cấu trúc cây (parent_id)."""
from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.models import PKMixin, TimestampMixin


class Organization(PKMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    depth: Mapped[int] = mapped_column(Integer, default=0)

    parent: Mapped[Organization | None] = relationship(
        "Organization", remote_side="Organization.id", back_populates="children"
    )
    children: Mapped[list[Organization]] = relationship(
        "Organization", back_populates="parent", cascade="all, delete-orphan"
    )
