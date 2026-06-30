"""Test các tính năng mới: Category CRUD, sale=regular, voucher auto-code, warranty remaining."""
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.core.database import SessionLocal
from app.modules.vouchers import service as voucher_service
from app.modules.vouchers.models import Voucher
from app.modules.warranties.models import Warranty


def _auth(client, token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---- Category CRUD --------------------------------------------------------


def test_category_crud(client, admin_token):
    h = _auth(client, admin_token)

    # Tạo (slug bỏ trống -> tự sinh từ tên).
    res = client.post("/api/categories", json={"name": "Tài khoản Premium"}, headers=h)
    assert res.status_code == 201, res.text
    data = res.json()["data"]
    cat_id = data["id"]
    assert data["slug"]  # đã tự sinh
    assert data["product_count"] == 0

    # Danh sách.
    res = client.get("/api/categories", headers=h)
    assert res.status_code == 200
    assert any(c["id"] == cat_id for c in res.json()["data"])

    # Cập nhật.
    res = client.put(f"/api/categories/{cat_id}", json={"sort_order": 5, "status": "inactive"}, headers=h)
    assert res.status_code == 200
    assert res.json()["data"]["sort_order"] == 5
    assert res.json()["data"]["status"] == "inactive"

    # Xóa.
    res = client.delete(f"/api/categories/{cat_id}", headers=h)
    assert res.status_code == 200
    res = client.get(f"/api/categories/{cat_id}", headers=h)
    assert res.status_code == 404


# ---- Giá bán = giá niêm yết khi markup 0 ----------------------------------


def test_sale_price_equals_regular_when_markup_zero(client, admin_token):
    h = _auth(client, admin_token)
    res = client.post(
        "/api/products",
        json={
            "name": "SP giá niêm yết",
            "base_price": 100000,
            "regular_price": 150000,
            "markup_percent": 0,
            "markup_amount": 0,
        },
        headers=h,
    )
    assert res.status_code == 201, res.text
    data = res.json()["data"]
    # Giá bán = giá niêm yết (markup 0); lợi nhuận tiềm năng = 150000 - 100000.
    assert Decimal(str(data["sale_price"])) == Decimal("150000.00")
    assert Decimal(str(data["list_price"])) == Decimal("150000.00")


def test_sale_price_falls_back_to_base_when_no_regular(client, admin_token):
    h = _auth(client, admin_token)
    res = client.post(
        "/api/products",
        json={"name": "SP không niêm yết", "base_price": 80000, "markup_percent": 0},
        headers=h,
    )
    assert res.status_code == 201, res.text
    data = res.json()["data"]
    assert Decimal(str(data["sale_price"])) == Decimal("80000.00")


# ---- Voucher tự sinh mã ---------------------------------------------------


def test_voucher_auto_code_from_description(client, admin_token):
    h = _auth(client, admin_token)
    res = client.post(
        "/api/vouchers",
        json={"description": "Giảm hè 2026", "discount_type": "amount", "discount_value": 10000},
        headers=h,
    )
    assert res.status_code == 201, res.text
    code = res.json()["data"]["code"]
    assert code  # đã tự sinh
    # Tiền tố sinh từ mô tả (bỏ dấu/ký tự lạ, viết hoa) + hậu tố ngẫu nhiên sau "-".
    assert code.startswith("GIM")
    assert "-" in code


def test_generate_unique_code_is_unique():
    db = SessionLocal()
    try:
        codes = {voucher_service.generate_unique_code(db, "Khuyến mãi test") for _ in range(20)}
        # Tất cả phải khác nhau (hậu tố ngẫu nhiên).
        assert len(codes) == 20
        # Và chưa tồn tại trong DB.
        for c in codes:
            assert db.query(Voucher).filter(Voucher.code == c).first() is None
    finally:
        db.close()


def test_voucher_explicit_code_preserved(client, admin_token):
    h = _auth(client, admin_token)
    res = client.post(
        "/api/vouchers",
        json={"code": "MYCODE2026", "discount_type": "percent", "discount_value": 10},
        headers=h,
    )
    assert res.status_code == 201, res.text
    assert res.json()["data"]["code"] == "MYCODE2026"


# ---- Warranty remaining_days ----------------------------------------------


def test_warranty_remaining_days(client, admin_token, admin_org_id):
    db = SessionLocal()
    try:
        w = Warranty(
            code="WR-REMAIN-TEST",
            product_name="SP bảo hành",
            starts_at=datetime.now(UTC),
            ends_at=datetime.now(UTC) + timedelta(days=10),
            status="active",
            organization_id=admin_org_id,
        )
        db.add(w)
        db.commit()
        wid = w.id
    finally:
        db.close()

    h = _auth(client, admin_token)
    res = client.get(f"/api/warranties/{wid}", headers=h)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["remaining_days"] in (10, 11)  # tùy làm tròn lên
    assert "Còn" in data["remaining_label"]


def test_warranty_expired_label(client, admin_token, admin_org_id):
    db = SessionLocal()
    try:
        w = Warranty(
            code="WR-EXPIRED-TEST",
            product_name="SP hết hạn",
            starts_at=datetime.now(UTC) - timedelta(days=40),
            ends_at=datetime.now(UTC) - timedelta(days=10),
            status="active",
            organization_id=admin_org_id,
        )
        db.add(w)
        db.commit()
        wid = w.id
    finally:
        db.close()

    h = _auth(client, admin_token)
    res = client.get(f"/api/warranties/{wid}", headers=h)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["remaining_days"] == 0
    assert data["remaining_label"] == "Hết hạn"
