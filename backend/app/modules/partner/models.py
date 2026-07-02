"""Model module Partner.

- ProviderOrderRef: liên kết Order nội bộ ↔ đơn phía nhà cung cấp (1-1 theo driver).
- ProviderWebhookEvent: log VD-Event-Id đã xử lý để chống trùng (dedup) + audit.
- SupplierSyncRun/SupplierSyncItem: nhật ký đồng bộ catalog, preview, cảnh báo biên lãi.

Các bảng dùng `driver`/`supplier_id` để hỗ trợ nhiều nhà cung cấp về sau (vdstore, ...).
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
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


class SupplierSyncRun(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    """Một lần preview/apply đồng bộ catalog NCC.

    Run giúp admin biết mỗi lần sync tạo/cập nhật/ngưng bán gì, sync do ai chạy
    (admin hay scheduler) và lỗi/cảnh báo biên lãi nằm ở đâu.
    """

    __tablename__ = "supplier_sync_runs"

    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    driver: Mapped[str] = mapped_column(String(50), index=True)
    supplier_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mode: Mapped[str] = mapped_column(String(20), default="manual", index=True)  # manual|dry_run|scheduled
    status: Mapped[str] = mapped_column(String(20), default="running", index=True)  # running|success|failed|skipped
    livemode: Mapped[bool] = mapped_column(default=False)

    total: Mapped[int] = mapped_column(Integer, default=0)
    created_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_count: Mapped[int] = mapped_column(Integer, default=0)
    discontinued_count: Mapped[int] = mapped_column(Integer, default=0)
    reactivated_count: Mapped[int] = mapped_column(Integer, default=0)
    unchanged_count: Mapped[int] = mapped_column(Integer, default=0)
    warning_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)

    requested_by: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)


class SupplierSyncItem(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    """Chi tiết thay đổi/cảnh báo trong một SupplierSyncRun."""

    __tablename__ = "supplier_sync_items"

    run_id: Mapped[int] = mapped_column(
        ForeignKey("supplier_sync_runs.id", ondelete="CASCADE"), index=True
    )
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    product_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(30), index=True)  # create|update|discontinue|reactivate|warning|error
    warning_code: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    old_base_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    new_base_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    old_sale_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    new_sale_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    margin_after: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    stock_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)
