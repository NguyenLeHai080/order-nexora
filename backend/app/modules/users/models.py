"""Model User + quan hệ tổ chức, vai trò (scope theo tổ chức), preference.

- organization_user: user thuộc những tổ chức nào (many-to-many).
- user_roles: vai trò của user TRONG MỘT tổ chức cụ thể (team-scoped),
  nên có cột organization_id — giống cơ chế team của dự án tham chiếu.
- user_preferences: nhớ current_organization_id để lần đăng nhập sau tự chọn.
"""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Column, ForeignKey, Numeric, String, Table, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.models import PKMixin, TimestampMixin

# User <-> Organization (user truy cập được những tổ chức nào)
organization_user = Table(
    "organization_user",
    Base.metadata,
    Column("organization_id", ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class UserRole(PKMixin, Base):
    """Gán vai trò cho user trong phạm vi một tổ chức."""

    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", "organization_id", name="uq_user_role_org"),)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), index=True)
    organization_id: Mapped[int | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True
    )


class UserPreference(PKMixin, TimestampMixin, Base):
    __tablename__ = "user_preferences"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    current_organization_id: Mapped[int | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )


class User(PKMixin, TimestampMixin, Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    user_name: Mapped[str | None] = mapped_column(String(150), unique=True, index=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)  # active | locked

    # Ví tiền (số dư) — dùng cho nạp tiền/mua hàng.
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))

    organizations: Mapped[list[Organization]] = relationship(  # noqa: F821
        "Organization", secondary=organization_user, lazy="selectin"
    )
