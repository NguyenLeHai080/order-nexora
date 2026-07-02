"""Đồng bộ catalog nhà cung cấp: preview/apply/audit/lock.

Luồng chính:
1. Lấy catalog từ provider qua registry client.
2. Tính diff theo (supplier_id, external_id): create/update/reactivate/discontinue.
3. Cảnh báo sản phẩm có biên lãi <= 0 sau khi giá vốn NCC đổi.
4. Ghi SupplierSyncRun/SupplierSyncItem để admin xem lịch sử và preview.
5. Apply chỉ khi dry_run=False; dry-run không thay đổi Product.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.integrations import registry
from app.modules.categories.models import Category
from app.modules.organizations.utils import slugify
from app.modules.partner.models import SupplierSyncItem, SupplierSyncRun
from app.modules.products.models import Product
from app.modules.settings import service as settings_service
from app.modules.suppliers.models import Supplier

RUNNING_TTL_MINUTES = 30


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


def _now() -> datetime:
    return datetime.utcnow()


def _as_decimal(value: Any) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _sale_price(base_price: Decimal, regular_price: Decimal | None, markup_percent: Decimal, markup_amount: Decimal) -> Decimal:
    list_price = regular_price if regular_price is not None else base_price
    return list_price * (Decimal("1") + (markup_percent or Decimal("0")) / Decimal("100")) + (markup_amount or Decimal("0"))


def _item_payload(fields: dict, category_name: str | None) -> dict:
    return {
        "name": fields.get("name"),
        "name_en": fields.get("name_en"),
        "category_name": category_name,
        "base_price": str(fields.get("base_price")),
        "regular_price": str(fields.get("regular_price")) if fields.get("regular_price") is not None else None,
        "provider_discount_percent": str(fields.get("provider_discount_percent")) if fields.get("provider_discount_percent") is not None else None,
        "delivery_type": fields.get("delivery_type"),
        "provider_quantity": fields.get("provider_quantity"),
        "stock_status": fields.get("stock_status"),
    }


def _get_or_create_category(
    db: Session,
    cache: dict[str, Category],
    name: str | None,
    organization_id: int | None,
    *,
    dry_run: bool,
) -> Category | None:
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
    if category is None and not dry_run:
        category = Category(
            name=name,
            slug=slugify(name) or key,
            organization_id=organization_id,
            status="active",
        )
        db.add(category)
        db.flush()
    if category is not None:
        cache[key] = category
    return category


def _open_running_run(db: Session, supplier_id: int) -> SupplierSyncRun | None:
    cutoff = _now() - timedelta(minutes=RUNNING_TTL_MINUTES)
    return db.scalars(
        select(SupplierSyncRun)
        .where(
            SupplierSyncRun.supplier_id == supplier_id,
            SupplierSyncRun.status == "running",
            SupplierSyncRun.started_at >= cutoff,
        )
        .order_by(SupplierSyncRun.started_at.desc())
    ).first()


def _create_run(db: Session, supplier: Supplier, *, mode: str, actor_id: int | None) -> SupplierSyncRun:
    running = _open_running_run(db, supplier.id)
    if running is not None:
        raise AppException(f"Nhà cung cấp '{supplier.name}' đang có phiên đồng bộ #{running.id} chưa xong.")

    run = SupplierSyncRun(
        supplier_id=supplier.id,
        driver=supplier.driver,
        supplier_name=supplier.name,
        mode=mode,
        status="running",
        organization_id=supplier.organization_id,
        requested_by=actor_id,
        started_at=_now(),
        meta={},
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def _add_item(
    db: Session,
    run: SupplierSyncRun,
    *,
    supplier: Supplier,
    action: str,
    product: Product | None = None,
    external_id: str | None = None,
    product_name: str | None = None,
    warning_code: str | None = None,
    note: str | None = None,
    old_base_price: Decimal | None = None,
    new_base_price: Decimal | None = None,
    old_sale_price: Decimal | None = None,
    new_sale_price: Decimal | None = None,
    margin_after: Decimal | None = None,
    stock_status: str | None = None,
    payload: dict | None = None,
) -> SupplierSyncItem:
    item = SupplierSyncItem(
        run_id=run.id,
        supplier_id=supplier.id,
        product_id=product.id if product is not None else None,
        external_id=external_id or (product.external_id if product is not None else None),
        product_name=product_name or (product.name if product is not None else None),
        action=action,
        warning_code=warning_code,
        note=note,
        old_base_price=old_base_price,
        new_base_price=new_base_price,
        old_sale_price=old_sale_price,
        new_sale_price=new_sale_price,
        margin_after=margin_after,
        stock_status=stock_status,
        payload=payload,
        organization_id=supplier.organization_id,
    )
    db.add(item)
    return item


def _apply_fields(product: Product, fields: dict, category_name: str | None, category_id: int | None) -> None:
    product.name = fields["name"]
    product.description = fields["description"]
    product.name_en = fields.get("name_en")
    product.category_name = category_name
    if category_id is not None:
        product.category_id = category_id
    product.base_price = fields["base_price"]
    product.regular_price = fields.get("regular_price")
    product.provider_discount_percent = fields.get("provider_discount_percent")
    product.delivery_type = fields.get("delivery_type")
    product.provider_quantity = fields.get("provider_quantity")
    product.stock_status = fields["stock_status"]
    if product.status == "inactive" and fields["stock_status"] != "out_of_stock":
        product.status = "active"


def run_supplier_sync(
    db: Session,
    supplier: Supplier,
    *,
    dry_run: bool = False,
    mode: str | None = None,
    actor_id: int | None = None,
    discontinue_missing: bool = True,
    batch_size: int = 100,
) -> CatalogSyncResult:
    """Chạy một phiên sync cho 1 NCC.

    `dry_run=True` chỉ ghi SupplierSyncRun/SupplierSyncItem để xem trước, không sửa Product.
    `batch_size` dùng để flush định kỳ khi apply catalog lớn; commit vẫn ở cuối run để giữ
    audit và Product cùng trạng thái nhất quán.
    """
    run_mode = mode or ("dry_run" if dry_run else "manual")
    run = _create_run(db, supplier, mode=run_mode, actor_id=actor_id)
    result = CatalogSyncResult(dry_run=dry_run, run_id=run.id)

    try:
        client = registry.get_client(supplier)
        catalog = client.get_catalog()
        result.livemode = bool(catalog.livemode)
        run.livemode = result.livemode

        default_markup = settings_service.get_default_markup_percent(db)
        provider_products: list[tuple[object, str | None]] = [(p, None) for p in catalog.uncategorized]
        for cat in catalog.categories:
            provider_products.extend((p, cat.name) for p in cat.products)
        result.total = len(provider_products)
        run.total = result.total

        existing_products = {
            p.external_id: p
            for p in db.scalars(
                select(Product).where(Product.supplier_id == supplier.id, Product.external_id.isnot(None))
            ).all()
            if p.external_id
        }
        seen_external_ids: set[str] = set()
        category_cache: dict[str, Category] = {}

        for index, (provider_product, category_name) in enumerate(provider_products, start=1):
            fields = client.map_catalog_product(provider_product)
            external_id = str(fields["external_id"])
            seen_external_ids.add(external_id)
            product = existing_products.get(external_id)
            new_base = _as_decimal(fields.get("base_price"))
            regular = fields.get("regular_price")
            new_regular = _as_decimal(regular) if regular is not None else None
            payload = _item_payload(fields, category_name)

            if product is None:
                sale_after = _sale_price(new_base, new_regular, default_markup, Decimal("0"))
                margin_after = sale_after - new_base
                result.created += 1
                run.created_count += 1
                _add_item(
                    db,
                    run,
                    supplier=supplier,
                    action="create",
                    external_id=external_id,
                    product_name=fields.get("name"),
                    new_base_price=new_base,
                    new_sale_price=sale_after,
                    margin_after=margin_after,
                    stock_status=fields.get("stock_status"),
                    payload=payload,
                    note="Sản phẩm mới từ catalog NCC.",
                )
                if margin_after <= 0:
                    result.warnings += 1
                    run.warning_count += 1
                    _add_item(
                        db,
                        run,
                        supplier=supplier,
                        action="warning",
                        external_id=external_id,
                        product_name=fields.get("name"),
                        warning_code="non_positive_margin",
                        note="Biên lãi sau sync <= 0. Cần đặt markup hoặc kiểm tra giá NCC.",
                        new_base_price=new_base,
                        new_sale_price=sale_after,
                        margin_after=margin_after,
                        stock_status=fields.get("stock_status"),
                        payload=payload,
                    )
                if not dry_run:
                    category = _get_or_create_category(
                        db, category_cache, category_name, supplier.organization_id, dry_run=False
                    )
                    product = Product(
                        name=fields["name"],
                        slug=slugify(fields["name"]) or external_id,
                        description=fields["description"],
                        name_en=fields.get("name_en"),
                        category_name=category_name,
                        category_id=category.id if category is not None else None,
                        supplier_id=supplier.id,
                        external_id=external_id,
                        base_price=fields["base_price"],
                        regular_price=fields.get("regular_price"),
                        provider_discount_percent=fields.get("provider_discount_percent"),
                        delivery_type=fields.get("delivery_type"),
                        provider_quantity=fields.get("provider_quantity"),
                        markup_percent=default_markup,
                        stock_status=fields["stock_status"],
                        status="active",
                        organization_id=supplier.organization_id,
                    )
                    db.add(product)
            else:
                old_base = _as_decimal(product.base_price)
                old_sale = _as_decimal(product.sale_price)
                sale_after = _sale_price(
                    new_base,
                    new_regular,
                    _as_decimal(product.markup_percent),
                    _as_decimal(product.markup_amount),
                )
                margin_after = sale_after - new_base
                changed = any(
                    [
                        product.name != fields["name"],
                        product.description != fields["description"],
                        product.name_en != fields.get("name_en"),
                        product.category_name != category_name,
                        _as_decimal(product.base_price) != new_base,
                        product.regular_price != fields.get("regular_price"),
                        product.provider_discount_percent != fields.get("provider_discount_percent"),
                        product.delivery_type != fields.get("delivery_type"),
                        product.provider_quantity != fields.get("provider_quantity"),
                        product.stock_status != fields["stock_status"],
                        product.status == "inactive" and fields["stock_status"] != "out_of_stock",
                    ]
                )
                if changed:
                    action = "reactivate" if product.status == "inactive" and fields["stock_status"] != "out_of_stock" else "update"
                    if action == "reactivate":
                        result.reactivated += 1
                        run.reactivated_count += 1
                    else:
                        result.updated += 1
                        run.updated_count += 1
                    _add_item(
                        db,
                        run,
                        supplier=supplier,
                        action=action,
                        product=product,
                        old_base_price=old_base,
                        new_base_price=new_base,
                        old_sale_price=old_sale,
                        new_sale_price=sale_after,
                        margin_after=margin_after,
                        stock_status=fields.get("stock_status"),
                        payload=payload,
                        note="Cập nhật dữ liệu nguồn từ NCC, giữ markup admin.",
                    )
                    if not dry_run:
                        category = _get_or_create_category(
                            db, category_cache, category_name, supplier.organization_id, dry_run=False
                        )
                        _apply_fields(product, fields, category_name, category.id if category is not None else None)
                else:
                    result.unchanged += 1
                    run.unchanged_count += 1

                if margin_after <= 0:
                    result.warnings += 1
                    run.warning_count += 1
                    _add_item(
                        db,
                        run,
                        supplier=supplier,
                        action="warning",
                        product=product,
                        warning_code="non_positive_margin",
                        note="Biên lãi sau sync <= 0. Cần đặt markup hoặc kiểm tra giá NCC.",
                        old_base_price=old_base,
                        new_base_price=new_base,
                        old_sale_price=old_sale,
                        new_sale_price=sale_after,
                        margin_after=margin_after,
                        stock_status=fields.get("stock_status"),
                        payload=payload,
                    )

            if not dry_run and index % max(batch_size, 1) == 0:
                db.flush()

        if discontinue_missing:
            missing = [
                p
                for ext, p in existing_products.items()
                if ext not in seen_external_ids and p.status == "active"
            ]
            for product in missing:
                result.discontinued += 1
                run.discontinued_count += 1
                _add_item(
                    db,
                    run,
                    supplier=supplier,
                    action="discontinue",
                    product=product,
                    old_base_price=_as_decimal(product.base_price),
                    old_sale_price=_as_decimal(product.sale_price),
                    stock_status="out_of_stock",
                    note="Sản phẩm không còn trong catalog NCC: tự ngưng bán để tránh khách mua hàng đã bị gỡ.",
                )
                if not dry_run:
                    product.stock_status = "out_of_stock"
                    product.status = "inactive"

        run.status = "success"
        run.finished_at = _now()
        run.meta = {
            "dry_run": dry_run,
            "discontinue_missing": discontinue_missing,
            "batch_size": batch_size,
        }
        db.commit()
        return result
    except Exception as exc:
        db.rollback()
        # Ghi lại run fail bằng transaction mới nếu có thể.
        try:
            run.status = "failed"
            run.error_count += 1
            run.error_message = str(exc)
            run.finished_at = _now()
            db.add(run)
            db.commit()
        except Exception:  # noqa: BLE001
            db.rollback()
        raise


def latest_running_or_last_run(db: Session, supplier_id: int) -> SupplierSyncRun | None:
    return db.scalars(
        select(SupplierSyncRun)
        .where(SupplierSyncRun.supplier_id == supplier_id)
        .order_by(SupplierSyncRun.created_at.desc(), SupplierSyncRun.id.desc())
    ).first()


def list_runs(db: Session, *, organization_id: int | None, supplier_id: int | None, status: str | None, offset: int, limit: int) -> tuple[list[SupplierSyncRun], int]:
    stmt = select(SupplierSyncRun)
    count_stmt = select(func.count()).select_from(SupplierSyncRun)
    filters = []
    if organization_id is not None:
        filters.append(SupplierSyncRun.organization_id == organization_id)
    if supplier_id is not None:
        filters.append(SupplierSyncRun.supplier_id == supplier_id)
    if status:
        filters.append(SupplierSyncRun.status == status)
    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)
    total = db.scalar(count_stmt) or 0
    items = db.scalars(stmt.order_by(SupplierSyncRun.created_at.desc(), SupplierSyncRun.id.desc()).offset(offset).limit(limit)).all()
    return list(items), int(total)


def list_run_items(db: Session, run_id: int, *, organization_id: int | None) -> list[SupplierSyncItem]:
    stmt = select(SupplierSyncItem).where(SupplierSyncItem.run_id == run_id)
    if organization_id is not None:
        stmt = stmt.where(SupplierSyncItem.organization_id == organization_id)
    return list(db.scalars(stmt.order_by(SupplierSyncItem.id)).all())
