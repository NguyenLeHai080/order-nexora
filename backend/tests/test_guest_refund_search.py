"""Smoke test luồng mới: guest checkout -> mark-paid -> fulfill failed -> mark-refunded,
+ search/filter đơn theo loại khách và từ khóa, + endpoint /orders/alerts.
"""
from app.core.database import SessionLocal
from app.modules.settings import service as settings_service


def _auth(token: str, org_id: int) -> dict:
    return {"Authorization": f"Bearer {token}", "X-Organization-Id": str(org_id)}


def _enable_guest_checkout() -> None:
    db = SessionLocal()
    try:
        settings_service.set_value(db, settings_service.GUEST_CHECKOUT_ENABLED_KEY, "1")
        settings_service.set_value(db, settings_service.GUEST_AUTO_FULFILL_KEY, "0")
    finally:
        db.close()


def _new_product(client, headers, name) -> dict:
    return client.post(
        "/api/products",
        headers=headers,
        json={"name": name, "base_price": "10000", "regular_price": "20000", "markup_percent": "0"},
    ).json()["data"]


def test_guest_refund_and_search_flow(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    _enable_guest_checkout()
    prod = _new_product(client, headers, "SP guest refund TEST")
    # Nhập kho để có hàng bán (SP tự quản kho).
    client.post(
        "/api/inventory/stock-in",
        headers=headers,
        json={"product_id": prod["id"], "quantity": 5, "reason": "Nhập test"},
    )

    # 1) Guest đặt đơn (không auth) -> awaiting_payment + trả reference/token.
    res = client.post(
        "/api/public/guest-orders",
        json={
            "items": [{"product_id": prod["id"], "quantity": 1}],
            "name": "Nguyen Van Guest",
            "phone": "0912345678",
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()["data"]
    reference = body["reference"]
    token = body["lookup_token"]
    order_code = body["orders"][0]["code"]
    order_id = body["orders"][0]["id"]
    # Response public KHÔNG được lộ giá vốn/lãi.
    assert "total_cost" not in body["orders"][0]
    assert "owner_profit" not in body["orders"][0]

    # 2) Lookup đúng token -> thấy đơn; sai token -> 404.
    ok = client.get("/api/public/orders/lookup", params={"code": order_code, "token": token})
    assert ok.status_code == 200, ok.text
    bad = client.get("/api/public/orders/lookup", params={"code": order_code, "token": "wrong"})
    assert bad.status_code == 404

    # 3) Admin xác nhận đã thanh toán -> processing + payment paid.
    paid = client.post(f"/api/orders/{order_id}/mark-paid", headers=headers)
    assert paid.status_code == 200, paid.text
    assert paid.json()["data"]["status"] == "processing"
    assert paid.json()["data"]["payment_status"] == "paid"

    # 4) Admin duyệt THẤT BẠI -> failed.
    failed = client.post(
        f"/api/orders/{order_id}/fulfill",
        headers=headers,
        json={"result": "failed", "note": "NCC hết hàng"},
    )
    assert failed.status_code == 200, failed.text
    assert failed.json()["data"]["status"] == "failed"

    # 5) Admin đánh dấu ĐÃ HOÀN TIỀN tay -> payment_status refunded.
    refunded = client.post(
        f"/api/orders/{order_id}/mark-refunded",
        headers=headers,
        json={"note": "Đã CK lại cho khách"},
    )
    assert refunded.status_code == 200, refunded.text
    assert refunded.json()["data"]["payment_status"] == "refunded"

    # 6) Search theo SĐT khách + lọc guest.
    search = client.get(
        "/api/orders",
        headers=headers,
        params={"search": "0912345678", "customer_type": "guest"},
    )
    assert search.status_code == 200, search.text
    codes = [o["code"] for o in search.json()["data"]]
    assert order_code in codes

    # Lọc account KHÔNG được chứa đơn guest này.
    acc = client.get("/api/orders", headers=headers, params={"customer_type": "account"})
    assert order_code not in [o["code"] for o in acc.json()["data"]]

    # 7) /orders/alerts trả về cấu trúc mong đợi.
    alerts = client.get("/api/orders/alerts", headers=headers)
    assert alerts.status_code == 200, alerts.text
    adata = alerts.json()["data"]
    assert set(["processing_count", "awaiting_count", "latest_id", "recent"]).issubset(adata.keys())
