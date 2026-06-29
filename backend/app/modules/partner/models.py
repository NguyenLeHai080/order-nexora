"""Model module Partner.

- ProviderOrderRef: liên kết Order nội bộ ↔ đơn phía nhà cung cấp (1-1 theo driver).
- ProviderWebhookEvent: log VD-Event-Id đã xử lý để chống trùng (dedup) + audit.

Cả hai dùng `driver` để hỗ trợ nhiều nhà cung cấp về sau (vdstore, ...).
"""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class ProviderOrderRef(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    """Mapping đơn nội bộ ↔ đơn nhà cung cấp.

    external_order_id = mã đơn nội bộ ta gửi sang (chính là Order.code), dùng làm
    Idempotency-Key. provider_order_id = id đơn phía nhà cung cấp (vd po_123).
    """

    __tablename__ = "provider_order_refs"
    __table_args__ = (
        # Một đơn nội bộ chỉ map 1 lần cho mỗi driver.
        UniqueConstraint("driver", "order_id", name="uq_provider_order_driver_order"),
        # Không trùng id đơn phía provider trong cùng driver.
        UniqueConstraint(
            "driver", "provider_order_id", name="uq_provider_order_driver_provider_id"
        ),
    )

    driver: Mapped[str] = mapped_column(String(50), default="vdstore", index=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), index=True
    )
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Mã đơn nội bộ gửi sang (Order.code) — cũng là Idempotency-Key.
    external_order_id: Mapped[str] = mapped_column(String(64), index=True)
    # Id đơn phía nhà cung cấp.
    provider_order_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)

    # Trạng thái gốc phía provider (FULFILLED|PENDING_FULFILLMENT|...).
    provider_status: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    # Môi trường tạo đơn này (test|live) — đối chiếu livemode.
    environment: Mapped[str] = mapped_column(String(10), default="test", index=True)
    livemode: Mapped[bool] = mapped_column(default=False)

    refunded_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class ProviderWebhookEvent(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    """Log event webhook đã nhận để chống xử lý trùng (theo VD-Event-Id)."""

    __tablename__ = "provider_webhook_events"
    __table_args__ = (
        UniqueConstraint("driver", "event_id", name="uq_provider_webhook_driver_event"),
    )

    driver: Mapped[str] = mapped_column(String(50), default="vdstore", index=True)
    # VD-Event-Id (header) — khóa chống trùng.
    event_id: Mapped[str] = mapped_column(String(128), index=True)
    event_type: Mapped[str | None] = mapped_column(String(60), nullable=True)
    provider_order_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    livemode: Mapped[bool] = mapped_column(default=False)
    # received | processed | skipped | failed
    status: Mapped[str] = mapped_column(String(20), default="received", index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
