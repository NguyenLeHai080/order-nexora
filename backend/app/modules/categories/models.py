"""Model Category — danh mục sản phẩm (org-scoped)."""
from __future__ import annotations

from sqlalchemy import Boolean, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class Category(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Thứ tự hiển thị (nhỏ hơn lên trước).
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    # Cho phép admin ẩn/hiện danh mục trên landing (độc lập với status nghiệp vụ).
    show_on_landing: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), index=True
    )
