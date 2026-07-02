"""Test engine đồng bộ catalog NCC: dry-run, audit, warning và rule ngưng bán."""
from datetime import datetime
from decimal import Decimal

import pytest

from app.core.database import SessionLocal
from app.core.exceptions import AppException
from app.integrations.vdstore.schemas import VDCatalog, VDCatalogProduct
from app.modules.partner import catalog_sync
from app.modules.partner.models import SupplierSyncRun
from app.modules.products.models import Product
from app.modules.settings import service as settings_service
from app.modules.suppliers.models import Supplier


class _FakeCatalogClient:
    def __init__(self, catalog: VDCatalog):
        self._catalog = catalog

    def get_catalog(self) -> VDCatalog:
        return self._catalog

    def map_catalog_product(self, product) -> dict:
        from app.integrations.vdstore import mapper

        return mapper.catalog_product_to_internal(product)


def _vd_product(pid: str, name: str, price: int, *, regular_price: int | None = None, available: bool = True) -> VDCatalogProduct:
    return VDCatalogProduct(
        id=pid,
        name=name,
        price=price,
        regularPrice=regular_price,
        deliveryType="STOCK_ITEM",
        available=available,
        availableQuantity=10 if available else 0,
    )


def _catalog(*products: VDCatalogProduct) -> VDCatalog:
    return VDCatalog(livemode=False, categories=[], uncategorized=list(products))


def _supplier(db, name: str) -> Supplier:  # noqa: ANN001
    supplier = Supplier(name=name, driver="vdstore", status="active", organization_id=1)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def test_catalog_sync_dry_run_writes_audit_but_does_not_create_product(monkeypatch):
    db = SessionLocal()
    try:
        supplier = _supplier(db, "NCC dry-run sync")
        catalog = _catalog(_vd_product("dry_run_ext", "SP preview", 100000, regular_price=120000))
        monkeypatch.setattr(catalog_sync.registry, "get_client", lambda s: _FakeCatalogClient(catalog))

        result = catalog_sync.run_supplier_sync(db, supplier, dry_run=True, mode="dry_run", actor_id=1)

        assert result.dry_run is True
        assert result.created == 1
        assert result.run_id is not None
        assert db.query(Product).filter(Product.supplier_id == supplier.id, Product.external_id == "dry_run_ext").first() is None

        run = db.get(SupplierSyncRun, result.run_id)
        assert run is not None
        assert run.status == "success"
        assert run.created_count == 1
        items = catalog_sync.list_run_items(db, result.run_id, organization_id=1)
        assert [item.action for item in items] == ["create"]
    finally:
        db.close()


def test_catalog_sync_apply_preserves_markup_warns_and_discontinues_missing(monkeypatch):
    db = SessionLocal()
    try:
        settings_service.set_value(db, settings_service.DEFAULT_MARKUP_KEY, "0")
        supplier = _supplier(db, "NCC apply sync")
        keep = Product(
            name="SP giữ markup cũ",
            slug="sp-giu-markup-cu",
            description="old",
            supplier_id=supplier.id,
            external_id="keep_ext",
            base_price=Decimal("90000"),
            regular_price=Decimal("100000"),
            markup_percent=Decimal("25"),
            stock_status="in_stock",
            status="active",
            organization_id=1,
        )
        missing = Product(
            name="SP bị gỡ khỏi NCC",
            slug="sp-bi-go-khoi-ncc",
            description="old",
            supplier_id=supplier.id,
            external_id="missing_ext",
            base_price=Decimal("50000"),
            regular_price=Decimal("60000"),
            markup_percent=Decimal("10"),
            stock_status="in_stock",
            status="active",
            organization_id=1,
        )
        db.add_all([keep, missing])
        db.commit()

        catalog = _catalog(
            _vd_product("keep_ext", "SP giữ markup mới tên", 110000, regular_price=120000),
            _vd_product("zero_margin_ext", "SP cần cảnh báo lãi", 50000, regular_price=50000),
        )
        monkeypatch.setattr(catalog_sync.registry, "get_client", lambda s: _FakeCatalogClient(catalog))

        result = catalog_sync.run_supplier_sync(db, supplier, dry_run=False, mode="manual", actor_id=1)

        assert result.created == 1
        assert result.updated == 1
        assert result.discontinued == 1
        assert result.warnings == 1

        db.refresh(keep)
        db.refresh(missing)
        assert keep.markup_percent == Decimal("25.00")
        assert keep.base_price == Decimal("110000.00")
        assert missing.status == "inactive"
        assert missing.stock_status == "out_of_stock"

        created = db.query(Product).filter(Product.supplier_id == supplier.id, Product.external_id == "zero_margin_ext").one()
        assert created.markup_percent == Decimal("0.00")
        assert created.sale_price == Decimal("50000.00")

        actions = [item.action for item in catalog_sync.list_run_items(db, result.run_id, organization_id=1)]
        assert "create" in actions
        assert "update" in actions
        assert "discontinue" in actions
        assert "warning" in actions
    finally:
        db.close()


def test_catalog_sync_lock_blocks_duplicate_running_run():
    db = SessionLocal()
    try:
        supplier = _supplier(db, "NCC running lock")
        run = SupplierSyncRun(
            supplier_id=supplier.id,
            driver=supplier.driver,
            supplier_name=supplier.name,
            mode="manual",
            status="running",
            organization_id=1,
            started_at=datetime.utcnow(),
        )
        db.add(run)
        db.commit()

        with pytest.raises(AppException):
            catalog_sync.run_supplier_sync(db, supplier, dry_run=True, mode="dry_run", actor_id=1)
    finally:
        db.close()
