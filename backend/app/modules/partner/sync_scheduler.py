"""Scheduler nền cho đồng bộ catalog NCC.

Mặc định tắt qua setting `catalog_sync_enabled=0`. Khi bật, scheduler chạy trong
FastAPI lifespan, kiểm tra định kỳ và gọi sync theo từng supplier active có capability
`catalog`. Vì watchdog hiện chạy 1 worker, in-process scheduler là đủ nhẹ; DB lock
(SupplierSyncRun running TTL) vẫn chặn manual/scheduled sync trùng nhau.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy import select

from app.core.database import SessionLocal
from app.integrations import registry
from app.integrations.errors import ProviderError
from app.modules.notifications import service as notification_service
from app.modules.partner import catalog_sync
from app.modules.partner.models import SupplierSyncRun
from app.modules.settings import service as settings_service
from app.modules.suppliers.models import Supplier

logger = logging.getLogger(__name__)


async def run_catalog_sync_scheduler(stop_event: asyncio.Event) -> None:
    """Loop nền nhẹ: mỗi phút kiểm tra setting và chạy các supplier đã đến hạn."""
    while not stop_event.is_set():
        try:
            await asyncio.to_thread(_tick)
        except Exception:  # noqa: BLE001
            logger.exception("catalog sync scheduler tick failed")
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=60)
        except TimeoutError:
            continue


def _tick() -> None:
    db = SessionLocal()
    try:
        config = settings_service.get_catalog_sync_config(db)
        if not config["enabled"]:
            return
        interval_minutes = int(config["interval_minutes"])
        if interval_minutes < 5:
            return

        suppliers = db.scalars(
            select(Supplier).where(Supplier.status == "active").order_by(Supplier.id)
        ).all()
        for supplier in suppliers:
            if not registry.has_capability(supplier.driver, "catalog"):
                continue
            if not _is_due(db, supplier.id, interval_minutes):
                continue
            try:
                result = catalog_sync.run_supplier_sync(
                    db,
                    supplier,
                    dry_run=False,
                    mode="scheduled",
                    actor_id=None,
                    discontinue_missing=bool(config["discontinue_missing"]),
                )
                if config["notify"] and (result.created or result.updated or result.discontinued or result.warnings):
                    notification_service.notify_admin(
                        db,
                        "🔁 Đồng bộ NCC tự động "
                        f"{supplier.name}: {result.created} mới, {result.updated} cập nhật, "
                        f"{result.discontinued} ngưng bán, {result.warnings} cảnh báo.",
                    )
            except ProviderError as exc:
                _notify_fail(db, supplier.name, exc.message if hasattr(exc, "message") else str(exc), bool(config["notify"]))
            except Exception as exc:  # noqa: BLE001
                logger.exception("scheduled catalog sync failed for supplier_id=%s", supplier.id)
                _notify_fail(db, supplier.name, str(exc), bool(config["notify"]))
    finally:
        db.close()


def _is_due(db, supplier_id: int, interval_minutes: int) -> bool:  # noqa: ANN001
    latest = db.scalars(
        select(SupplierSyncRun)
        .where(
            SupplierSyncRun.supplier_id == supplier_id,
            SupplierSyncRun.mode == "scheduled",
            SupplierSyncRun.status.in_(["running", "success"]),
        )
        .order_by(SupplierSyncRun.started_at.desc(), SupplierSyncRun.id.desc())
    ).first()
    if latest is None or latest.started_at is None:
        return True
    # Nếu còn running trong TTL, không chạy trùng. Nếu quá TTL, run_supplier_sync sẽ tự xử lý lock.
    if latest.status == "running" and latest.started_at >= datetime.utcnow() - timedelta(minutes=catalog_sync.RUNNING_TTL_MINUTES):
        return False
    return latest.started_at <= datetime.utcnow() - timedelta(minutes=interval_minutes)


def _notify_fail(db, supplier_name: str, message: str, enabled: bool) -> None:  # noqa: ANN001
    if not enabled:
        return
    try:
        notification_service.notify_admin(db, f"⚠️ Đồng bộ NCC tự động lỗi ({supplier_name}): {message[:300]}")
    except Exception:  # noqa: BLE001
        logger.exception("catalog sync failure notification failed")
