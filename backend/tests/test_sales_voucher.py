"""Test luồng bán hàng còn thiếu: áp voucher lúc mua + báo cáo lợi nhuận theo SP.

- Voucher giảm trên tổng tiền khách trả -> owner_profit co lại, giá vốn (total_cost)
  và phải trả NCC (supplier_payable) giữ nguyên.
- /orders/profit-by-product gộp doanh thu/giá vốn/lãi theo từng sản phẩm.
"""
from fastapi.testclient import TestClient


def _auth(token: str, org_id: int) -> dict:
    return {"Authorization": f"Bearer {token}", "X-Organization-Id": str(org_id)}


def _new_product(client, headers, name, *, base_price="10000", markup_percent="0") -> dict:
    return client.post(
        "/api/products",
        headers=headers,
        json={"name": name, "base_price": base_price, "markup_percent": markup_percent},
    ).json()["data"]


def _topup(client, headers, amount="1000000") -> None:
    me = client.get("/api/user", headers=headers).json()["data"]["user"]
    client.post(f"/api/users/{me['id']}/balance", headers=headers, json={"amount": amount})


def test_purchase_with_voucher_shrinks_owner_profit(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    # markup 100% -> sale_price = 10000 × 2 = 20000.
    prod = _new_product(client, headers, "SP mua kèm voucher", base_price="10000", markup_percent="100")
    client.post("/api/inventory/stock-in", headers=headers, json={"product_id": prod["id"], "quantity": 5})
    _topup(client, headers)

    # Voucher giảm cố định 5000.
    voucher = client.post(
        "/api/vouchers",
        headers=headers,
        json={"code": "GIAM5K", "discount_type": "amount", "discount_value": 5000},
    ).json()["data"]
    assert voucher["code"] == "GIAM5K"

    order = client.post(
        "/api/orders",
        headers=headers,
        json={"product_id": prod["id"], "quantity": 1, "voucher_code": "GIAM5K"},
    ).json()["data"]

    # Khách trả 20000 − 5000 = 15000; giá vốn vẫn 10000 -> lãi co còn 5000.
    assert order["total_amount"] == "15000.00"
    assert order["total_cost"] == "10000.00"
    assert order["owner_profit"] == "5000.00"
    # SP local (không NCC) -> phải trả NCC = 0, không bị voucher ảnh hưởng.
    assert order["supplier_payable"] == "0.00"


def test_voucher_percent_capped_by_max_discount(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    prod = _new_product(client, headers, "SP voucher %", base_price="10000", markup_percent="100")
    client.post("/api/inventory/stock-in", headers=headers, json={"product_id": prod["id"], "quantity": 2})
    _topup(client, headers)

    # 50% nhưng trần giảm 3000 -> chỉ giảm 3000 trên tổng 20000.
    client.post(
        "/api/vouchers",
        headers=headers,
        json={"code": "NUA-GIA", "discount_type": "percent", "discount_value": 50, "max_discount": 3000},
    )
    order = client.post(
        "/api/orders",
        headers=headers,
        json={"product_id": prod["id"], "quantity": 1, "voucher_code": "NUA-GIA"},
    ).json()["data"]
    assert order["total_amount"] == "17000.00"  # 20000 − 3000 (trần)


def test_profit_by_product_aggregates_per_product(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    prod = _new_product(client, headers, "SP báo cáo theo SP", base_price="10000", markup_percent="50")
    client.post("/api/inventory/stock-in", headers=headers, json={"product_id": prod["id"], "quantity": 10})
    _topup(client, headers)

    # Bán 3 đơn x 1 sp: sale = 15000, vốn = 10000 -> lãi 5000/đơn.
    for _ in range(3):
        client.post("/api/orders", headers=headers, json={"product_id": prod["id"], "quantity": 1})

    rows = client.get("/api/orders/profit-by-product", headers=headers).json()["data"]
    row = next(r for r in rows if r["product_id"] == prod["id"])
    assert row["order_count"] == 3
    assert float(row["revenue"]) == 45000  # 3 × 15000
    assert float(row["cost"]) == 30000  # 3 × 10000
    assert float(row["profit"]) == 15000  # 3 × 5000
