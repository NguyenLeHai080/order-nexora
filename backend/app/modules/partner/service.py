"""Service module Partner — điều phối nghiệp vụ ↔ lớp adapter nhà cung cấp.

Đây là tầng nghiệp vụ: nhận model nội bộ (Order, Product, Supplier), resolve driver
từ registry theo supplier.driver, gọi adapter, dịch kết quả bằng mapper của driver,
ghi ProviderOrderRef/Voucher và áp guard livemode (chỉ với driver hỗ trợ). Router/
Order service KHÔNG gọi adapter trực tiếp — chỉ qua đây.

Quy ước trả về: FulfillmentResult.status ∈ {success, processing, failed}
- success    : đã có nội dung giao (FULFILLED) -> giao cho khách.
- processing : đơn còn chờ admin NCC (PENDING/PARTIAL) -> giữ tiền, đợi webhook.
- failed     : NCC từ chối/hết hàng/lỗi -> Order service hoàn tiền.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.integrations import registry
from app.integrations.errors import ProviderError
from app.modules.categories.models import Category
from app.modules.orders.models import Order
from app.modules.organizations.utils import slugify
from app.modules.partner import catalog_sync
from app.modules.partner.models import ProviderOrderRef, ProviderWebhookEvent
from app.modules.partner.repository import (
    ProviderOrderRefRepository,
    ProviderWebhookEventRepository,
)
from app.modules.products.models import Product
from app.modules.settings import service as settings_service
from app.modules.suppliers.models import Supplier
from app.modules.users.models import User
from app.modules.vouchers.models import Voucher


@dataclass
class FulfillmentResult:
    status: str  # success | processing | failed
    delivered_content: str | None = None
    provider_order_id: str | None = None
    provider_status: str | None = None
    note: str | None = None


def get_active_supplier(
    db: Session, driver: str = "vdstore", organization_id: int | None = None
) -> Supplier | None:
    """Lấy supplier active theo driver (ưu tiên đúng tổ chức)."""
    stmt = select(Supplier).where(Supplier.driver == driver, Supplier.status == "active")
    if organization_id is not None:
        stmt = stmt.where(Supplier.organization_id == organization_id)
    return db.scalars(stmt.order_by(Supplier.id)).first()


def _livemode_violation(supplier: Supplier, order_livemode: bool) -> bool:
    """True nếu cấu hình NCC không cho phép giao hàng thật.

    Chỉ áp cho driver có capability "livemode" (vd VD Store). Driver không có khái
    niệm livemode (vd Cazy) luôn được coi là hợp lệ.

    Tín hiệu quyết định là môi trường của CHÍNH supplier (test/live), KHÔNG phải
    APP_ENV toàn cục: supplier "live" mà nhận đơn livemode=false = lỗi cấu hình
    (dùng key test ở môi trường live) -> chặn. Supplier "test" thì đơn sandbox
    (livemode=false) là đúng kỳ vọng, cho giao nội dung test bình thường.
    """
    if not registry.has_capability(supplier.driver, "livemode"):
        return False
    return supplier.expects_livemode and not order_livemode


def fulfill_via_provider(db: Session, order, product: Product, supplier: Supplier) -> FulfillmentResult:
    """Tạo đơn sang nhà cung cấp cho một Order nội bộ và map kết quả.

    Driver được resolve từ registry theo supplier.driver. Idempotency-Key +
    externalOrderId = order.code (ổn định, chống tạo trùng). Ghi ProviderOrderRef
    để đối soát và cho webhook tra cứu sau này.
    """
    if not product.external_id:
        return FulfillmentResult(status="failed", note="Sản phẩm chưa map mã bên nhà cung cấp.")

    ref_repo = ProviderOrderRefRepository(db)

    try:
        client = registry.get_client(supplier)
        vd_order = client.create_order(
            external_order_id=order.code,
            items=[{"productId": product.external_id, "quantity": order.quantity}],
            idempotency_key=order.code,
        )
    except ProviderError as exc:
        # Lưu lại tham chiếu lỗi để đối soát (không có provider_order_id).
        _upsert_ref(
            ref_repo,
            order=order,
            supplier=supplier,
            provider_order_id=None,
            provider_status="ERROR",
            livemode=False,
            note=f"{exc.code}: {exc.detail}",
        )
        return FulfillmentResult(status="failed", note=exc.code)

    internal = client.map_order_to_internal(vd_order)

    # Guard livemode: không giao nội dung thật nếu vi phạm môi trường.
    if _livemode_violation(supplier, vd_order.livemode):
        _upsert_ref(
            ref_repo,
            order=order,
            supplier=supplier,
            provider_order_id=vd_order.id,
            provider_status=vd_order.status,
            livemode=vd_order.livemode,
            note="livemode_violation: từ chối giao hàng (đơn sandbox ở môi trường live).",
        )
        return FulfillmentResult(
            status="failed",
            provider_order_id=vd_order.id,
            provider_status=vd_order.status,
            note="livemode_violation",
        )

    _upsert_ref(
        ref_repo,
        order=order,
        supplier=supplier,
        provider_order_id=vd_order.id,
        provider_status=vd_order.status,
        livemode=vd_order.livemode,
        refunded_amount=internal.get("refunded_amount"),
    )

    return FulfillmentResult(
        status=internal["status"],
        delivered_content=internal["delivered_content"],
        provider_order_id=vd_order.id,
        provider_status=vd_order.status,
    )


def _upsert_ref(
    ref_repo: ProviderOrderRefRepository,
    *,
    order,
    supplier: Supplier,
    provider_order_id: str | None,
    provider_status: str | None,
    livemode: bool,
    refunded_amount=None,
    note: str | None = None,
) -> ProviderOrderRef:
    """Tạo mới hoặc cập nhật ProviderOrderRef cho order (idempotent theo driver+order)."""
    ref = ref_repo.by_order(order.id, driver=supplier.driver)
    if ref is None:
        ref = ProviderOrderRef(
            driver=supplier.driver,
            order_id=order.id,
            supplier_id=supplier.id,
            external_order_id=order.code,
            provider_order_id=provider_order_id,
            provider_status=provider_status,
            environment=supplier.environment,
            livemode=livemode,
            organization_id=order.organization_id,
            note=note,
        )
        if refunded_amount is not None:
            ref.refunded_amount = refunded_amount
        ref_repo.db.add(ref)
        ref_repo.db.commit()
        ref_repo.db.refresh(ref)
        return ref

    # Cập nhật.
    if provider_order_id:
        ref.provider_order_id = provider_order_id
    ref.provider_status = provider_status
    ref.livemode = livemode
    if refunded_amount is not None:
        ref.refunded_amount = refunded_amount
    if note:
        ref.note = note
    ref_repo.db.commit()
    ref_repo.db.refresh(ref)
    return ref


# ---- Reward voucher (từ webhook order.updated) ----------------------------


def upsert_reward_voucher(db: Session, vd_voucher, organization_id: int | None, client) -> Voucher | None:
    """Lưu voucher thưởng từ NCC thành Voucher nội bộ (idempotent theo code)."""
    data = client.map_reward_voucher(vd_voucher)
    existing = db.scalars(select(Voucher).where(Voucher.code == data["code"])).first()
    if existing is not None:
        return existing

    ends_at = _parse_iso(data.pop("ends_at_raw", None))
    voucher = Voucher(
        code=data["code"],
        description=data["description"],
        discount_type=data["discount_type"],
        discount_value=data["discount_value"],
        max_discount=data["max_discount"],
        usage_limit=data["usage_limit"],
        ends_at=ends_at,
        status="active",
        organization_id=organization_id,
    )
    db.add(voucher)
    db.commit()
    db.refresh(voucher)
    return voucher


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


# ---- Catalog sync (GET /catalog -> Product) -------------------------------


@dataclass
class CatalogSyncResult:
    created: int = 0
    updated: int = 0
    discontinued: int = 0
    reactivated: int = 0
    unchanged: int = 0
    warnings: int = 0
    errors: int = 0
    total: int = 0
    livemode: bool = False
    run_id: int | None = None
    dry_run: bool = False


def _get_or_create_category(
    db: Session,
    cache: dict[str, Category],
    name: str | None,
    organization_id: int | None,
) -> Category | None:
    """Get-or-create Category theo (organization_id, name) từ tên danh mục NCC.

    Dùng cache trong 1 lần sync để tránh truy vấn lặp. Chưa commit ở đây — caller
    commit chung 1 lần ở cuối sync_catalog.
    """
    if not name:
        return None
    key = name.strip().lower()
    if not key:
        return None
    if key in cache:
        return cache[key]
    stmt = select(Category).where(Category.name == name)
    if organization_id is not None:
        stmt = stmt.where(Category.organization_id == organization_id)
    category = db.scalars(stmt).first()
    if category is None:
        category = Category(
            name=name,
            slug=slugify(name) or key,
            organization_id=organization_id,
            status="active",
        )
        db.add(category)
        db.flush()  # cần id để gán product.category_id
    cache[key] = category
    return category


def sync_catalog(db: Session, supplier: Supplier) -> CatalogSyncResult:
    """Đồng bộ catalog NCC -> Product, có audit SyncRun và cảnh báo biên lãi.

    Giữ chữ ký cũ để các test/endpoint đang gọi không phải đổi. Logic thật nằm ở
    partner.catalog_sync để hỗ trợ thêm dry-run, lịch sử, lock và automation.
    """
    result = catalog_sync.run_supplier_sync(db, supplier, dry_run=False, mode="manual")
    return CatalogSyncResult(
        created=result.created,
        updated=result.updated,
        discontinued=result.discontinued,
        reactivated=result.reactivated,
        unchanged=result.unchanged,
        warnings=result.warnings,
        errors=result.errors,
        total=result.total,
        livemode=result.livemode,
        run_id=result.run_id,
        dry_run=result.dry_run,
    )


# ---- Balance (GET /balance) -----------------------------------------------


def get_balance(supplier: Supplier) -> dict:
    """Lấy số dư ví CTV phía NCC (chỉ hiển thị/đối soát, không ghi DB)."""
    client = registry.get_client(supplier)
    balance = client.get_balance()
    data = client.map_balance(balance)
    data["environment"] = supplier.environment
    return data


# ---- Webhook (verify HMAC -> dedup -> cập nhật Order -> reward voucher) ----


@dataclass
class WebhookResult:
    status: str  # processed | duplicate | invalid | ignored
    event_id: str | None = None
    note: str | None = None


def handle_webhook(
    db: Session,
    *,
    raw_body: bytes,
    signature_header: str,
    event_id: str | None,
    now_ts: int,
    supplier: Supplier,
) -> WebhookResult:
    """Xử lý 1 webhook VD Store.

    Bước: verify chữ ký HMAC -> dedup theo VD-Event-Id -> parse -> cập nhật Order
    nội bộ theo provider_order_id -> nếu có reward voucher thì lưu.

    KHÔNG giao hàng thật nếu livemode=False khi đang chạy production (mục 11).
    Trả WebhookResult để router quyết HTTP code (luôn cố trả 2xx cho event hợp lệ
    để NCC ngừng retry, trừ khi chữ ký sai).
    """
    # Webhook có thể đến từ môi trường test hoặc live; thử cả hai secret đã cấu hình.
    client = registry.get_client(supplier)
    candidate_secrets = [
        s
        for s in (supplier.webhook_secret_live, supplier.webhook_secret_test, supplier.active_webhook_secret)
        if s
    ]
    signed_ok = any(
        client.verify_webhook(
            raw_body=raw_body,
            signature_header=signature_header,
            secret=secret,
            now_ts=now_ts,
        )
        for secret in candidate_secrets
    )
    if not signed_ok:
        return WebhookResult(status="invalid", event_id=event_id, note="Chữ ký không hợp lệ.")

    event = client.parse_webhook(raw_body)
    eid = event_id or event.id

    evt_repo = ProviderWebhookEventRepository(db)
    # Dedup theo VD-Event-Id.
    if evt_repo.by_event_id(eid, driver=supplier.driver) is not None:
        return WebhookResult(status="duplicate", event_id=eid)

    log = ProviderWebhookEvent(
        driver=supplier.driver,
        event_id=eid,
        event_type=event.type,
        livemode=event.livemode,
        organization_id=supplier.organization_id,
        status="received",
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # Event test: chỉ ghi nhận, không làm gì thêm.
    if event.type == "webhook.test" or event.data is None or event.data.order is None:
        log.status = "skipped"
        log.note = "Event test hoặc không có dữ liệu đơn."
        db.commit()
        return WebhookResult(status="ignored", event_id=eid, note=log.note)

    vd_order = event.data.order
    log.provider_order_id = vd_order.id

    ref_repo = ProviderOrderRefRepository(db)
    ref = ref_repo.by_provider_order_id(vd_order.id, driver=supplier.driver)
    if ref is None and vd_order.external_order_id:
        ref = ref_repo.by_external_order_id(vd_order.external_order_id, driver=supplier.driver)

    if ref is None:
        log.status = "skipped"
        log.note = "Không tìm thấy đơn nội bộ tương ứng."
        db.commit()
        return WebhookResult(status="ignored", event_id=eid, note=log.note)

    _apply_order_update(db, ref, vd_order, supplier, client)

    # Voucher thưởng (nếu có) — chỉ với đơn live.
    if event.livemode and event.data.reward_voucher is not None:
        upsert_reward_voucher(db, event.data.reward_voucher, supplier.organization_id, client)

    log.status = "processed"
    db.commit()
    return WebhookResult(status="processed", event_id=eid)


def _apply_order_update(db: Session, ref: ProviderOrderRef, vd_order, supplier: Supplier, client) -> None:
    """Cập nhật Order nội bộ theo trạng thái mới của đơn NCC."""
    internal = client.map_order_to_internal(vd_order)
    new_status = internal["status"]

    # Cập nhật tham chiếu provider.
    ref.provider_status = vd_order.status
    ref.livemode = vd_order.livemode
    if internal.get("refunded_amount") is not None:
        ref.refunded_amount = internal["refunded_amount"]

    order = db.get(Order, ref.order_id)
    if order is None:
        db.commit()
        return

    # Guard: production không nhận đơn sandbox.
    if _livemode_violation(supplier, vd_order.livemode):
        order.note = "livemode_violation: bỏ qua cập nhật đơn sandbox ở môi trường live."
        db.commit()
        return

    # Đơn bị hủy -> hoàn tiền nếu trước đó chưa hoàn (chưa ở failed).
    if new_status == "failed" and order.status != "failed":
        user = db.get(User, order.user_id)
        if user is not None:
            from app.modules.finance import service as finance_service

            finance_service.post_wallet_txn(
                db, user, type="refund", direction="in",
                amount=order.total_amount or Decimal("0"),
                organization_id=order.organization_id, ref_type="order", ref_id=order.id,
                note="Hoàn tiền: NCC hủy đơn",
            )
        order.status = "failed"
        order.note = "Nhà cung cấp đã hủy đơn, đã hoàn tiền vào ví."
    elif new_status == "success":
        order.status = "success"
        if internal.get("delivered_content"):
            order.delivered_content = internal["delivered_content"]
    else:
        order.status = "processing"

    db.commit()
