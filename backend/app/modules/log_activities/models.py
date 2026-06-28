"""Model LogActivity — nhật ký hoạt động/audit của hệ thống."""
from __future__ import annotations

from sqlalchemy import JSON, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import PKMixin, TimestampMixin


class LogActivity(PKMixin, TimestampMixin, Base):
    __tablename__ = "log_activities"

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    user_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    organization_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    route: Mapped[str | None] = mapped_column(Text, nullable=True)
    method_type: Mapped[str | None] = mapped_column(String(10), nullable=True, index=True)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    request_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
