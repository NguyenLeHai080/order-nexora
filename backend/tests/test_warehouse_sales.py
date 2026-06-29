"""Test luồng kho + bán hàng: nhập kho, gate tồn, hủy đơn, hóa đơn, bảo hành, đổi/trả."""
from fastapi.testclient import TestClient


def _auth(token: str, org_id: int) -> dict:
    return {"Authorization": f"Bearer {token}", "X-Organization-Id": str(org_id)}


def _new_product(client, headers, name, *, base_price="10000", warranty_days=0) -> dict:
    return client.post(
        "/api/products",
        headers=headers,
        json={
            "name": name,
            "base_price": base_price,
            "markup_percent": "0",
            "warranty_days": warranty_days,
        },
    ).json()["data"]


def _topup(client, headers, amount="1000000") -> None:
    me = client.get("/api/user", headers=headers).json()["data"]["user"]
    client.post(f"/api/users/{me['id']}/balance", headers=headers, json={"amount": amount})


def test_stock_in_and_movements(client: TestClient, admin_token: str, admin_org_id: int):
    headers = _auth(admin_token, admin_org_id)
    prod = _new_product(client, headers, "SP nhập kho")

    res = client.post(
        "/api/inventory/stock-in",
        headers=headers,
        json={"product_id": prod["id"], "quantity": 10, "reason": "Nhập đầu kỳ"},
    )
    assert res.status_code == 201, res.text
    mv = res.json()["data"]
    assert mv["type"] == "in"
    assert mv["quantity_delta"] == 10
    assert mv["balance_after"] == 10

    after = client.get(f"/api/products/{prod['id']}", headers=headers).json()["data"]
    assert after["quantity"] == 10
    assert after["stock_status"] == "in_stock"

    # Sổ kho lọc theo product.
    rows = client.get(
        f"/api/inventory/movements?product_id={prod['id']}", headers=headers
    ).json()["data"]
    assert len(rows) == 1


def test_adjust_cannot_go_negative(client: TestClient, admin_token: str, admin_org_id: int):
    headers = _auth(admin_token, admin_org_id)
    prod = _new_product(client, headers, "SP điều chỉnh")
    client.post("/api/inventory/stock-in", headers=headers,
                json={"product_id": prod["id"], "quantity": 3})
    res = client.post("/api/inventory/adjust", headers=headers,
                      json={"product_id": prod["id"], "quantity_delta": -5})
    assert res.status_code == 400
    assert res.json()["success"] is False


def test_purchase_blocked_without_stock(client: TestClient, admin_token: str, admin_org_id: int):
    headers = _auth(admin_token, admin_org_id)
    prod = _new_product(client, headers, "SP chưa nhập kho")
    _topup(client, headers)
    res = client.post("/api/orders", headers=headers,
                      json={"product_id": prod["id"], "quantity": 1})
    assert res.status_code == 400
    assert "kho" in res.json()["message"].lower()


def test_cancel_order_restores_stock_and_refunds(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    prod = _new_product(client, headers, "SP hủy đơn", base_price="20000")
    client.post("/api/inventory/stock-in", headers=headers,
                json={"product_id": prod["id"], "quantity": 5})
    _topup(client, headers)

    me = client.get("/api/user", headers=headers).json()["data"]["user"]
    bal_before = client.get(f"/api/users/{me['id']}", headers=headers).json()["data"]["balance"]

    order = client.post("/api/orders", headers=headers,
                        json={"product_id": prod["id"], "quantity": 2}).json()["data"]
    assert client.get(f"/api/products/{prod['id']}", headers=headers).json()["data"]["quantity"] == 3

    res = client.post(f"/api/orders/{order['id']}/cancel", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["status"] == "cancelled"

    # Tồn hồi lại + ví hoàn về mức trước khi mua.
    assert client.get(f"/api/products/{prod['id']}", headers=headers).json()["data"]["quantity"] == 5
    bal_after = client.get(f"/api/users/{me['id']}", headers=headers).json()["data"]["balance"]
    assert float(bal_after) == float(bal_before)

    # Hủy lần 2 -> chặn (đơn đã cancelled).
    res2 = client.post(f"/api/orders/{order['id']}/cancel", headers=headers)
    assert res2.status_code == 400


def test_warranty_auto_created(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    prod = _new_product(client, headers, "SP có bảo hành", warranty_days=30)
    client.post("/api/inventory/stock-in", headers=headers,
                json={"product_id": prod["id"], "quantity": 1})
    _topup(client, headers)
    client.post("/api/orders", headers=headers, json={"product_id": prod["id"], "quantity": 1})

    warranties = client.get("/api/warranties", headers=headers).json()["data"]
    mine = [w for w in warranties if w["product_name"] == "SP có bảo hành"]
    assert mine and mine[0]["status"] == "active"
    assert mine[0]["ends_at"] is not None

    # Ghi nhận bảo hành -> claimed.
    wid = mine[0]["id"]
    res = client.post(f"/api/warranties/{wid}/claim", headers=headers,
                      json={"claim_note": "Lỗi kích hoạt"})
    assert res.status_code == 200, res.text
    assert res.json()["data"]["status"] == "claimed"


def test_return_flow(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    prod = _new_product(client, headers, "SP trả hàng", base_price="15000")
    client.post("/api/inventory/stock-in", headers=headers,
                json={"product_id": prod["id"], "quantity": 4})
    _topup(client, headers)
    order = client.post("/api/orders", headers=headers,
                        json={"product_id": prod["id"], "quantity": 1}).json()["data"]
    assert client.get(f"/api/products/{prod['id']}", headers=headers).json()["data"]["quantity"] == 3

    req = client.post("/api/returns", headers=headers,
                      json={"order_id": order["id"], "kind": "return",
                            "reason": "Không dùng nữa"}).json()["data"]
    client.post(f"/api/returns/{req['id']}/approve", headers=headers)
    res = client.post(f"/api/returns/{req['id']}/complete", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["status"] == "completed"

    # Hồi kho + đơn cancelled + hóa đơn refunded.
    assert client.get(f"/api/products/{prod['id']}", headers=headers).json()["data"]["quantity"] == 4
    assert client.get(f"/api/orders/{order['id']}", headers=headers).json()["data"]["status"] == "cancelled"


def test_exchange_flow(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    old = _new_product(client, headers, "SP cũ", base_price="10000")
    new = _new_product(client, headers, "SP mới", base_price="12000")
    client.post("/api/inventory/stock-in", headers=headers,
                json={"product_id": old["id"], "quantity": 3})
    client.post("/api/inventory/stock-in", headers=headers,
                json={"product_id": new["id"], "quantity": 3})
    _topup(client, headers)
    order = client.post("/api/orders", headers=headers,
                        json={"product_id": old["id"], "quantity": 1}).json()["data"]

    req = client.post("/api/returns", headers=headers,
                      json={"order_id": order["id"], "kind": "exchange",
                            "reason": "Muốn bản cao hơn",
                            "exchange_product_id": new["id"]}).json()["data"]
    client.post(f"/api/returns/{req['id']}/approve", headers=headers)
    res = client.post(f"/api/returns/{req['id']}/complete", headers=headers)
    assert res.status_code == 200, res.text

    # SP mới xuất kho (3->2), SP cũ hồi kho (2->3), đơn cập nhật sang SP mới.
    assert client.get(f"/api/products/{new['id']}", headers=headers).json()["data"]["quantity"] == 2
    assert client.get(f"/api/products/{old['id']}", headers=headers).json()["data"]["quantity"] == 3
    updated = client.get(f"/api/orders/{order['id']}", headers=headers).json()["data"]
    assert updated["product_name"] == "SP mới"


def _vdstore_supplier_id(client, headers) -> int:
    """Lấy id NCC driver vdstore (seed tạo sẵn 'VD Store (demo)')."""
    suppliers = client.get("/api/suppliers", headers=headers, params={"limit": 100}).json()["data"]
    vd = next(s for s in suppliers if s.get("driver") == "vdstore")
    return vd["id"]


def test_stock_view_local_and_low_flag(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    # Tạo SP kho riêng + đặt ngưỡng cảnh báo = 5.
    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "SP xem tồn", "base_price": "10000", "markup_percent": "0",
              "low_stock_threshold": 5},
    ).json()["data"]
    client.post("/api/inventory/stock-in", headers=headers,
                json={"product_id": prod["id"], "quantity": 10})

    def _row():
        rows = client.get("/api/inventory/stock", headers=headers,
                          params={"search": "SP xem tồn"}).json()["data"]
        return next(r for r in rows if r["product_id"] == prod["id"])

    r = _row()
    assert r["manages_local"] is True
    assert r["quantity"] == 10
    assert r["is_low"] is False

    # Giảm về 4 (<= ngưỡng 5) -> is_low True.
    client.post("/api/inventory/adjust", headers=headers,
                json={"product_id": prod["id"], "quantity_delta": -6})
    assert _row()["is_low"] is True

    # Lọc state=low phải thấy sản phẩm này.
    low_rows = client.get("/api/inventory/stock", headers=headers,
                          params={"state": "low"}).json()["data"]
    assert any(r["product_id"] == prod["id"] for r in low_rows)


def test_stock_view_provider_is_readonly(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    supplier_id = _vdstore_supplier_id(client, headers)
    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "SP NCC tồn", "base_price": "10000", "markup_percent": "0",
              "supplier_id": supplier_id, "external_id": "ext_stock_ro"},
    ).json()["data"]

    rows = client.get("/api/inventory/stock", headers=headers,
                      params={"search": "SP NCC tồn"}).json()["data"]
    row = next(r for r in rows if r["product_id"] == prod["id"])
    assert row["manages_local"] is False

    # Nhập/điều chỉnh kho local bị chặn (tồn của NCC).
    res_in = client.post("/api/inventory/stock-in", headers=headers,
                         json={"product_id": prod["id"], "quantity": 5})
    assert res_in.status_code == 400
    res_adj = client.post("/api/inventory/adjust", headers=headers,
                          json={"product_id": prod["id"], "quantity_delta": 5})
    assert res_adj.status_code == 400


def test_inventory_summary_shape(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    data = client.get("/api/inventory/summary", headers=headers).json()["data"]
    assert set(data.keys()) == {"total", "in_stock", "out_of_stock", "low_stock"}
    assert data["total"] == data["in_stock"] + data["out_of_stock"]


def _cashflow(client, headers) -> dict:
    return client.get("/api/inventory/cashflow", headers=headers).json()["data"]


def test_cashflow_local_stock_in_and_sale(client, admin_token, admin_org_id):
    """Kho riêng: nhập kho ghi CHI = giá vốn; bán hàng ghi THU = doanh thu."""
    headers = _auth(admin_token, admin_org_id)
    # markup 50% -> sale_price = 20000 * 1.5 = 30000.
    prod = client.post(
        "/api/products", headers=headers,
        json={"name": "SP cashflow local", "base_price": "20000", "markup_percent": "50"},
    ).json()["data"]

    before = _cashflow(client, headers)
    client.post("/api/inventory/stock-in", headers=headers,
                json={"product_id": prod["id"], "quantity": 10})
    after_in = _cashflow(client, headers)
    # Nhập 10 × 20000 = 200000 vào CHI (stock_in_cost).
    assert float(after_in["cash_out"]) - float(before["cash_out"]) == 200000
    assert float(after_in["stock_in_cost"]) - float(before["stock_in_cost"]) == 200000

    _topup(client, headers)
    client.post("/api/orders", headers=headers,
                json={"product_id": prod["id"], "quantity": 2})
    after_sale = _cashflow(client, headers)
    # Bán 2 × 30000 = 60000 vào THU (revenue). Kho riêng: bán KHÔNG ghi thêm CHI.
    assert float(after_sale["revenue"]) - float(after_in["revenue"]) == 60000
    assert float(after_sale["cash_out"]) - float(after_in["cash_out"]) == 0


def _vd_product(client, headers) -> dict:
    supplier_id = _vdstore_supplier_id(client, headers)
    return client.post(
        "/api/products", headers=headers,
        json={"name": "SP cashflow VD", "base_price": "10000", "markup_percent": "100",
              "supplier_id": supplier_id, "external_id": "ext_cashflow_vd"},
    ).json()["data"]


def _patch_vd_success(monkeypatch):
    """Giả lập NCC giao hàng thành công, không gọi API thật."""
    from app.modules.orders import service as order_service

    def fake(db, order, product):
        return order_service._Delivery(status="success", content="[TEST] delivered")

    monkeypatch.setattr(order_service, "_fetch_from_supplier", fake)


def test_cashflow_vd_sale_records_revenue_and_cost(client, admin_token, admin_org_id, monkeypatch):
    """SP của NCC (VD): bán ghi THU = doanh thu VÀ CHI = giá vốn (ledger dòng tiền-thuần)."""
    headers = _auth(admin_token, admin_org_id)
    _patch_vd_success(monkeypatch)
    prod = _vd_product(client, headers)
    _topup(client, headers)

    before = _cashflow(client, headers)
    order = client.post("/api/orders", headers=headers,
                        json={"product_id": prod["id"], "quantity": 3}).json()["data"]
    assert order["status"] == "success"
    after = _cashflow(client, headers)

    # sale_price = 10000 × 2 = 20000 -> THU = 3×20000 = 60000; CHI giá vốn = 3×10000 = 30000.
    assert float(after["revenue"]) - float(before["revenue"]) == 60000
    assert float(after["cash_out"]) - float(before["cash_out"]) == 30000
    # Lợi nhuận thuần đơn này = 60000 - 30000 = 30000.
    assert float(after["profit"]) - float(before["profit"]) == 30000

    # Tồn local KHÔNG đổi (VD quản tồn) — không sinh dòng "in"/đổi quantity.
    assert client.get(f"/api/products/{prod['id']}", headers=headers).json()["data"]["quantity"] == 0


def test_cashflow_cancel_vd_order_reverses(client, admin_token, admin_org_id, monkeypatch):
    """Hủy đơn VD: đảo dòng tiền -> net cashflow đơn này về 0."""
    headers = _auth(admin_token, admin_org_id)
    _patch_vd_success(monkeypatch)
    prod = _vd_product(client, headers)
    _topup(client, headers)

    before = _cashflow(client, headers)
    order = client.post("/api/orders", headers=headers,
                        json={"product_id": prod["id"], "quantity": 1}).json()["data"]
    res = client.post(f"/api/orders/{order['id']}/cancel", headers=headers)
    assert res.status_code == 200, res.text
    after = _cashflow(client, headers)

    # Bán rồi hủy: THU/CHI đảo lại hết -> chênh lệch lợi nhuận = 0.
    assert float(after["profit"]) - float(before["profit"]) == 0
