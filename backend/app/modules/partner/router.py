"""Router Partner — tích hợp nhà cung cấp (đa driver qua registry).

- GET  /partner/drivers : danh sách driver + descriptor (FE render modal động).
- GET/PUT /partner/webhook-config/{driver} : cấu hình webhook (driver có webhook).
- POST /partner/webhook/{driver}, /partner/{supplier_id}/webhook : nhận webhook NCC
  (KHÔNG auth, xác thực bằng chữ ký theo driver + dedup). Dùng raw body để verify.
- POST /partner/{supplier_id}/sync-catalog : đồng bộ catalog (driver có catalog).
- GET  /partner/{supplier_id}/balance : số dư (driver có balance).
- GET  /partner/order-refs, /partner/webhook-events : đối soát (admin).
"""
import secrets
import time

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import AppException, NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.integrations import registry
from app.integrations.errors import ProviderError
from app.modules.auth.dependencies import require
from app.modules.partner import service
from app.modules.partner.repository import (
    ProviderOrderRefRepository,
    ProviderWebhookEventRepository,
)
from app.modules.partner.schemas import (
    PartnerWebhookConfigOut,
    PartnerWebhookConfigUpdate,
    PartnerWebhookSecretGenerate,
    PartnerWebhookSecretOut,
    ProviderOrderRefOut,
    ProviderWebhookEventOut,
)
from app.modules.suppliers.models import Supplier

router = APIRouter(prefix="/partner", tags=["Partner Integration"])


def _require_driver(driver: str) -> None:
    """Đảm bảo driver đã đăng ký, nếu không thì 400 rõ ràng."""
    if not registry.is_registered(driver):
        raise AppException(f"Driver '{driver}' chưa được hỗ trợ.")


def _require_capability(driver: str, capability: str) -> None:
    _require_driver(driver)
    if not registry.has_capability(driver, capability):
        raise AppException(f"Nhà cung cấp '{driver}' không hỗ trợ tính năng '{capability}'.")


def _webhook_path(driver: str) -> str:
    return f"/api/partner/webhook/{driver}"


def _webhook_config_out(request: Request, supplier: Supplier | None, driver: str) -> dict:
    path = _webhook_path(driver)
    descriptor = registry.descriptor(driver).to_dict() if registry.is_registered(driver) else None
    data = PartnerWebhookConfigOut(
        supplier_id=supplier.id if supplier else None,
        driver=driver,
        webhook_path=path,
        webhook_url=str(request.base_url).rstrip("/") + path,
        name=supplier.name if supplier else None,
        api_endpoint=supplier.api_endpoint if supplier else None,
        environment=supplier.environment if supplier else "test",
        status=supplier.status if supplier else None,
        note=supplier.note if supplier else None,
        webhook_secret_test=supplier.webhook_secret_test if supplier else None,
        webhook_secret_live=supplier.webhook_secret_live if supplier else None,
        has_api_key_test=bool(supplier and (supplier.api_key_test or supplier.api_key)),
        has_api_key_live=bool(supplier and supplier.api_key_live),
        has_webhook_secret_test=bool(supplier and supplier.webhook_secret_test),
        has_webhook_secret_live=bool(supplier and supplier.webhook_secret_live),
    )
    out = data.model_dump(mode="json")
    out["descriptor"] = descriptor
    return out


def _get_supplier(db: Session, supplier_id: int) -> Supplier:
    obj = db.get(Supplier, supplier_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy nhà cung cấp.")
    _require_driver(obj.driver)
    return obj


def _get_or_create_supplier(db: Session, ctx: RequestContext, driver: str) -> Supplier:
    _require_driver(driver)

    supplier = service.get_active_supplier(db, driver=driver, organization_id=ctx.organization_id)
    if supplier is not None:
        return supplier

    descriptor = registry.descriptor(driver)
    supplier = Supplier(
        name=descriptor.label,
        driver=driver,
        api_endpoint=descriptor.default_endpoint,
        environment="test",
        status="active",
        organization_id=ctx.organization_id,
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/drivers", summary="Danh sách driver nhà cung cấp + descriptor")
def list_drivers(_ctx: RequestContext = Depends(require("partner.index"))) -> dict:
    return success([d.to_dict() for d in registry.list_descriptors()])


@router.get("/webhook-config/{driver}", summary="Cấu hình webhook cố định theo driver")
def webhook_config(
    driver: str,
    request: Request,
    ctx: RequestContext = Depends(require("partner.index")),
    db: Session = Depends(get_db),
) -> dict:
    _require_driver(driver)
    supplier = service.get_active_supplier(db, driver=driver, organization_id=ctx.organization_id)
    return success(_webhook_config_out(request, supplier, driver))


@router.put("/webhook-config/{driver}", summary="Tạo/cập nhật cấu hình webhook cố định")
def upsert_webhook_config(
    driver: str,
    body: PartnerWebhookConfigUpdate,
    request: Request,
    ctx: RequestContext = Depends(require("partner.update")),
    db: Session = Depends(get_db),
) -> dict:
    _require_driver(driver)

    supplier = service.get_active_supplier(db, driver=driver, organization_id=ctx.organization_id)
    data = body.model_dump(exclude_unset=True)
    if supplier is None:
        supplier = Supplier(driver=driver, organization_id=ctx.organization_id, **data)
        db.add(supplier)
    else:
        for key, value in data.items():
            if value is not None and hasattr(supplier, key):
                setattr(supplier, key, value)

    db.commit()
    db.refresh(supplier)
    return success(_webhook_config_out(request, supplier, driver), "Đã lưu cấu hình webhook nhà cung cấp.")


@router.post("/webhook-config/{driver}/generate-secret", summary="Tạo webhook secret cho nhà cung cấp")
def generate_webhook_secret(
    driver: str,
    body: PartnerWebhookSecretGenerate,
    request: Request,
    ctx: RequestContext = Depends(require("partner.update")),
    db: Session = Depends(get_db),
) -> dict:
    _require_capability(driver, "webhook")
    supplier = _get_or_create_supplier(db, ctx, driver)
    webhook_secret = "whsec_" + secrets.token_urlsafe(32)
    if body.environment == "live":
        supplier.webhook_secret_live = webhook_secret
    else:
        supplier.webhook_secret_test = webhook_secret
    supplier.environment = body.environment
    supplier.status = "active"
    db.commit()
    db.refresh(supplier)

    data = PartnerWebhookSecretOut(
        environment=body.environment,
        webhook_secret=webhook_secret,
        config=_webhook_config_out(request, supplier, driver),
    )
    return success(
        data.model_dump(mode="json"),
        "Đã tạo webhook secret. Hãy copy secret này đưa cho nhà cung cấp.",
    )


# ---------- Webhook (không auth, xác thực bằng chữ ký theo driver) ----------
@router.post("/webhook/{driver}", summary="Webhook cố định theo nhà cung cấp (khai 1 lần)")
async def webhook_fixed(driver: str, request: Request, db: Session = Depends(get_db)) -> dict:
    """URL webhook CỐ ĐỊNH cho NCC khai báo 1 lần (không phụ thuộc supplier_id).

    Tự resolve supplier active theo driver. Dùng URL này khi chỉ có 1 NCC mỗi
    driver — NCC không cần cập nhật lại khi ta đổi cấu hình supplier nội bộ.
    """
    _require_capability(driver, "webhook")
    supplier = service.get_active_supplier(db, driver=driver)
    if supplier is None:
        raise NotFoundError(f"Chưa cấu hình nhà cung cấp active cho driver '{driver}'.")
    return await _process_webhook(supplier, request, db)


@router.post("/{supplier_id}/webhook", summary="Nhận webhook từ nhà cung cấp")
async def webhook(supplier_id: int, request: Request, db: Session = Depends(get_db)) -> dict:
    supplier = _get_supplier(db, supplier_id)
    _require_capability(supplier.driver, "webhook")
    return await _process_webhook(supplier, request, db)


async def _process_webhook(supplier: Supplier, request: Request, db: Session) -> dict:
    raw_body = await request.body()
    client = registry.get_client(supplier)
    result = service.handle_webhook(
        db,
        raw_body=raw_body,
        signature_header=request.headers.get(client.webhook_signature_header(), ""),
        event_id=request.headers.get(client.webhook_event_id_header()),
        now_ts=int(time.time()),
        supplier=supplier,
    )
    if result.status == "invalid":
        # Chữ ký sai -> 400 để NCC biết không nhận.
        raise AppException(result.note or "Chữ ký webhook không hợp lệ.")
    # Hợp lệ/trùng/bỏ qua đều trả 2xx để NCC ngừng retry.
    return success({"status": result.status, "event_id": result.event_id})


# ---------- Sync catalog (Admin) ----------
@router.post("/{supplier_id}/sync-catalog", summary="Đồng bộ catalog nhà cung cấp")
def sync_catalog(
    supplier_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("partner.update")),
) -> dict:
    supplier = _get_supplier(db, supplier_id)
    _require_capability(supplier.driver, "catalog")
    try:
        result = service.sync_catalog(db, supplier)
    except ProviderError as exc:
        raise exc.to_app_exception() from exc
    return success(
        {
            "total": result.total,
            "created": result.created,
            "updated": result.updated,
            "livemode": result.livemode,
        },
        f"Đồng bộ xong: {result.created} mới, {result.updated} cập nhật.",
    )


# ---------- Balance (Admin) ----------
@router.get("/{supplier_id}/balance", summary="Số dư ví CTV phía nhà cung cấp")
def balance(
    supplier_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("partner.show")),
) -> dict:
    supplier = _get_supplier(db, supplier_id)
    _require_capability(supplier.driver, "balance")
    try:
        return success(service.get_balance(supplier))
    except ProviderError as exc:
        raise exc.to_app_exception() from exc


# ---------- Đối soát (Admin) ----------
@router.get("/order-refs", summary="Danh sách liên kết đơn nhà cung cấp")
def list_order_refs(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("partner.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = ProviderOrderRefRepository(db).paginate(params, organization_id=ctx.organization_id)
    return paginated(
        [ProviderOrderRefOut.model_validate(i).model_dump(mode="json") for i in items],
        total,
        params.page,
        params.limit,
    )


@router.get("/webhook-events", summary="Lịch sử webhook nhà cung cấp")
def list_webhook_events(
    params: ListParams = Depends(list_params),
    ctx: RequestContext = Depends(require("partner.index")),
    db: Session = Depends(get_db),
) -> dict:
    items, total = ProviderWebhookEventRepository(db).paginate(
        params, organization_id=ctx.organization_id
    )
    return paginated(
        [ProviderWebhookEventOut.model_validate(i).model_dump(mode="json") for i in items],
        total,
        params.page,
        params.limit,
    )
