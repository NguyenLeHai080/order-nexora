"""Test API public (landing) — KHÔNG auth, KHÔNG lộ giá vốn/markup/NCC."""
from decimal import Decimal

from app.core.database import SessionLocal
from app.modules.settings import service as settings_service


def _auth(token: str, org_id: int | None = None) -> dict:
    h = {"Authorization": f"Bearer {token}"}
    if org_id is not None:
        h["X-Organization-Id"] = str(org_id)
    return h


def _pin_public_org(org_id: int) -> None:
    """Ghim org hiển thị công khai = org admin để test xác định."""
    db = SessionLocal()
    try:
        settings_service.set_value(db, settings_service.PUBLIC_ORG_ID_KEY, str(org_id))
    finally:
        db.close()


# Trường nhạy cảm TUYỆT ĐỐI không được xuất hiện trong response public.
_FORBIDDEN_FIELDS = {
    "base_price",
    "markup_percent",
    "markup_amount",
    "provider_discount_percent",
    "supplier_id",
    "supplier_name",
    "external_id",
    "organization_id",
    "owner_user_id",
    "owner_profit",
}


def _make_public_product(client, admin_token, admin_org_id) -> dict:
    """Tạo 1 sản phẩm active qua admin (kèm header org như FE thật) + ghim org công khai."""
    res = client.post(
        "/api/products",
        json={
            "name": "Tài khoản ChatGPT Plus TEST",
            "base_price": 200000,
            "regular_price": 350000,
            "markup_percent": 0,
            "status": "active",
            "warranty_days": 30,
        },
        headers=_auth(admin_token, admin_org_id),
    )
    assert res.status_code == 201, res.text
    data = res.json()["data"]
    _pin_public_org(admin_org_id)
    return data


def test_public_products_no_auth_required(client, admin_token, admin_org_id):
    _make_public_product(client, admin_token, admin_org_id)
    # Gọi KHÔNG kèm token.
    res = client.get("/api/public/products")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)
    assert body["meta"]["total"] >= 1


def test_public_products_hide_cost_fields(client, admin_token, admin_org_id):
    _make_public_product(client, admin_token, admin_org_id)
    res = client.get("/api/public/products")
    items = res.json()["data"]
    assert items, "public list phải có ít nhất 1 sản phẩm"
    for item in items:
        leaked = _FORBIDDEN_FIELDS & set(item.keys())
        assert not leaked, f"Public product làm lộ trường nhạy cảm: {leaked}"
        # Trường an toàn phải có.
        assert "price" in item
        assert "slug" in item


def test_public_product_detail_by_slug(client, admin_token, admin_org_id):
    created = _make_public_product(client, admin_token, admin_org_id)
    slug = created["slug"]
    res = client.get(f"/api/public/products/{slug}")
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["slug"] == slug
    # price = sale_price (markup 0 -> = regular_price 350000).
    assert Decimal(str(data["price"])) == Decimal("350000.00")
    assert _FORBIDDEN_FIELDS.isdisjoint(data.keys())


def test_public_product_detail_404_for_unknown_slug(client):
    res = client.get("/api/public/products/khong-ton-tai-xyz")
    assert res.status_code == 404


def test_public_hides_inactive_products(client, admin_token, admin_org_id):
    _pin_public_org(admin_org_id)
    # Tạo sản phẩm inactive -> không được hiện public.
    res = client.post(
        "/api/products",
        json={"name": "SP ẩn TEST", "base_price": 100000, "regular_price": 120000, "status": "inactive"},
        headers=_auth(admin_token, admin_org_id),
    )
    assert res.status_code == 201, res.text
    slug = res.json()["data"]["slug"]
    res = client.get(f"/api/public/products/{slug}")
    assert res.status_code == 404


def test_public_categories_shape(client, admin_token, admin_org_id):
    _make_public_product(client, admin_token, admin_org_id)
    res = client.get("/api/public/categories")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)
    for cat in body["data"]:
        assert set(cat.keys()) == {"id", "name", "slug", "description", "product_count"}
