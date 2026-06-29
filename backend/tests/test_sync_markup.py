"""Test sync_catalog áp % markup mặc định cho sản phẩm MỚI (giữ markup cũ khi cập nhật)."""
from decimal import Decimal

from app.core.database import SessionLocal
from app.integrations.vdstore.schemas import VDCatalog, VDCatalogProduct
from app.modules.partner import service as partner_service
from app.modules.products.models import Product
from app.modules.settings import service as settings_service
from app.modules.suppliers.models import Supplier


class _FakeCatalogClient:
    """Client giả: trả VDCatalog cố định, dùng mapper thật qua catalog_product_to_internal."""

    def __init__(self, catalog: VDCatalog):
        self._catalog = catalog

    def get_catalog(self) -> VDCatalog:
        return self._catalog

    def map_catalog_product(self, product) -> dict:
        from app.integrations.vdstore import mapper

        return mapper.catalog_product_to_internal(product)


def _vd_product(pid: str, name: str, price: int) -> VDCatalogProduct:
    return VDCatalogProduct(
        id=pid, name=name, price=price, deliveryType="STOCK_ITEM", available=True
    )


def _make_catalog(*products: VDCatalogProduct) -> VDCatalog:
    return VDCatalog(livemode=False, categories=[], uncategorized=list(products))


def test_sync_applies_default_markup_to_new_products(monkeypatch):
    db = SessionLocal()
    try:
        # Cấu hình markup mặc định = 35%.
        settings_service.set_value(db, settings_service.DEFAULT_MARKUP_KEY, "35")

        supplier = db.query(Supplier).filter(Supplier.driver == "vdstore").first()
        assert supplier is not None

        catalog = _make_catalog(_vd_product("ext_markup_new", "SP markup mặc định", 100000))
        monkeypatch.setattr(
            partner_service.registry, "get_client", lambda s: _FakeCatalogClient(catalog)
        )

        partner_service.sync_catalog(db, supplier)

        prod = (
            db.query(Product)
            .filter(Product.supplier_id == supplier.id, Product.external_id == "ext_markup_new")
            .first()
        )
        assert prod is not None
        assert prod.markup_percent == Decimal("35")
        # Giá bán = 100000 × (1 + 35/100) = 135000.
        assert prod.sale_price == Decimal("135000.00")
    finally:
        db.close()


def test_sync_keeps_existing_markup_on_update(monkeypatch):
    db = SessionLocal()
    try:
        supplier = db.query(Supplier).filter(Supplier.driver == "vdstore").first()
        assert supplier is not None

        # Lần 1: markup mặc định 35% -> tạo mới.
        settings_service.set_value(db, settings_service.DEFAULT_MARKUP_KEY, "35")
        catalog = _make_catalog(_vd_product("ext_markup_keep", "SP giữ markup", 100000))
        monkeypatch.setattr(
            partner_service.registry, "get_client", lambda s: _FakeCatalogClient(catalog)
        )
        partner_service.sync_catalog(db, supplier)

        # Admin chỉnh tay markup -> 50%.
        prod = (
            db.query(Product)
            .filter(Product.supplier_id == supplier.id, Product.external_id == "ext_markup_keep")
            .first()
        )
        prod.markup_percent = Decimal("50")
        db.commit()

        # Lần 2: đổi markup mặc định 10% rồi sync lại -> KHÔNG ghi đè markup admin đã đặt.
        settings_service.set_value(db, settings_service.DEFAULT_MARKUP_KEY, "10")
        partner_service.sync_catalog(db, supplier)

        db.refresh(prod)
        assert prod.markup_percent == Decimal("50")
    finally:
        db.close()
