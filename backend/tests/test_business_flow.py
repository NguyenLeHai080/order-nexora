"""Test pagination chuẩn + luồng nghiệp vụ mua hàng end-to-end."""
from fastapi.testclient import TestClient


def _auth(token: str, org_id: int) -> dict:
    return {"Authorization": f"Bearer {token}", "X-Organization-Id": str(org_id)}


def test_pagination_meta_shape(client: TestClient, admin_token: str, admin_org_id: int):
    # Tạo vài sản phẩm rồi kiểm tra cấu trúc meta phân trang.
    for i in range(3):
        client.post(
            "/api/products",
            headers=_auth(admin_token, admin_org_id),
            json={"name": f"Tài liệu {i}", "base_price": "10000", "markup_percent": "20"},
        )
    res = client.get("/api/products?limit=2&page=1", headers=_auth(admin_token, admin_org_id))
    assert res.status_code == 200
    body = res.json()
    assert "data" in body and "meta" in body
    meta = body["meta"]
    for key in ("current_page", "last_page", "per_page", "total"):
        assert key in meta
    assert meta["per_page"] == 2
    assert len(body["data"]) <= 2


def test_sale_price_formula(client: TestClient, admin_token: str, admin_org_id: int):
    # base 10000, +20% -> 12000, +500 -> 12500
    res = client.post(
        "/api/products",
        headers=_auth(admin_token, admin_org_id),
        json={"name": "SP công thức", "base_price": "10000", "markup_percent": "20", "markup_amount": "500"},
    )
    assert res.status_code == 201, res.text
    assert float(res.json()["data"]["sale_price"]) == 12500.0


def test_purchase_flow(client: TestClient, admin_token: str, admin_org_id: int):
    headers = _auth(admin_token, admin_org_id)

    # 1) Tạo sản phẩm (thủ công -> tự quản tồn kho local).
    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Khóa học X", "base_price": "50000", "markup_percent": "0"},
    ).json()["data"]

    # 2) Nhập kho để có tồn (sản phẩm local-stock cần tồn mới bán được).
    client.post(
        "/api/inventory/stock-in",
        headers=headers,
        json={"product_id": prod["id"], "quantity": 5},
    )

    # 3) Nạp tiền cho admin (admin tự cộng ví của mình qua endpoint balance).
    me = client.get("/api/user", headers=headers).json()["data"]["user"]
    client.post(f"/api/users/{me['id']}/balance", headers=headers, json={"amount": "100000"})

    # 4) Mua hàng.
    res = client.post("/api/orders", headers=headers, json={"product_id": prod["id"], "quantity": 1})
    assert res.status_code == 201, res.text
    order = res.json()["data"]
    assert order["status"] == "success"
    assert order["total_amount"] == "50000.00"
    assert order["delivered_content"] is not None

    # 5) Tồn kho đã giảm + có hóa đơn phát hành.
    after = client.get(f"/api/products/{prod['id']}", headers=headers).json()["data"]
    assert after["quantity"] == 4
    invoices = client.get("/api/invoices", headers=headers).json()["data"]
    assert any(inv["product_name"] == "Khóa học X" and inv["status"] == "paid" for inv in invoices)


def test_purchase_insufficient_balance(client: TestClient, admin_token: str, admin_org_id: int):
    headers = _auth(admin_token, admin_org_id)
    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "SP đắt", "base_price": "999999999", "markup_percent": "0"},
    ).json()["data"]
    # Nhập kho để qua được cổng tồn kho -> kiểm tra đúng nhánh thiếu số dư.
    client.post(
        "/api/inventory/stock-in",
        headers=headers,
        json={"product_id": prod["id"], "quantity": 1},
    )
    # Tạo user mới ví rỗng.
    client.post(
        "/api/users",
        headers=headers,
        json={"name": "Nghèo", "email": "ngheo@example.com", "password": "password",
              "organization_ids": [admin_org_id]},
    )
    token = client.post(
        "/api/auth/login", json={"email": "ngheo@example.com", "password": "password"}
    ).json()["data"]["access_token"]
    res = client.post(
        "/api/orders",
        headers=_auth(token, admin_org_id),
        json={"product_id": prod["id"], "quantity": 1},
    )
    assert res.status_code == 400
    assert res.json()["success"] is False


def test_purchase_credits_owner_profit_wallet(client: TestClient, admin_token: str, admin_org_id: int):
    headers = _auth(admin_token, admin_org_id)
    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "SP co lai", "base_price": "10000", "markup_percent": "50"},
    ).json()["data"]
    client.post("/api/inventory/stock-in", headers=headers, json={"product_id": prod["id"], "quantity": 2})

    me = client.get("/api/user", headers=headers).json()["data"]["user"]
    client.post(f"/api/users/{me['id']}/balance", headers=headers, json={"amount": "100000"})
    bal_before = float(client.get(f"/api/users/{me['id']}", headers=headers).json()["data"]["balance"])

    order = client.post("/api/orders", headers=headers, json={"product_id": prod["id"], "quantity": 1}).json()["data"]
    assert order["total_amount"] == "15000.00"
    assert order["total_cost"] == "10000.00"
    assert order["owner_profit"] == "5000.00"
    assert order["supplier_payable"] == "0.00"

    bal_after = float(client.get(f"/api/users/{me['id']}", headers=headers).json()["data"]["balance"])
    assert bal_before - bal_after == 10000

    summary = client.get("/api/orders/profit-summary", headers=headers).json()["data"]
    assert float(summary["owner_profit"]) >= 5000
    assert summary["owner_wallet_user_id"] == me["id"]


def test_manual_fulfillment_order_waits_for_staff(client: TestClient, admin_token: str, admin_org_id: int):
    headers = _auth(admin_token, admin_org_id)
    prod = client.post(
        "/api/products",
        headers=headers,
        json={
            "name": "SP can admin xu ly",
            "base_price": "20000",
            "markup_percent": "25",
            "delivery_type": "MANUAL",
        },
    ).json()["data"]
    client.post("/api/inventory/stock-in", headers=headers, json={"product_id": prod["id"], "quantity": 1})
    me = client.get("/api/user", headers=headers).json()["data"]["user"]
    client.post(f"/api/users/{me['id']}/balance", headers=headers, json={"amount": "100000"})

    order = client.post("/api/orders", headers=headers, json={"product_id": prod["id"], "quantity": 1}).json()["data"]
    assert order["status"] == "processing"
    assert order["manual_fulfillment_required"] is True
    assert order["manual_contact_name"] == "Nguyen Le Hai"
    assert order["owner_profit"] == "5000.00"
