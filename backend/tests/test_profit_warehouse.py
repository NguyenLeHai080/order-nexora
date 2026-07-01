"""Test /orders/profit-summary gộp dòng tiền sổ kho (nhập hàng + bán hàng).

Mục tiêu: lợi nhuận không chỉ tính từ đơn bán, mà phản ánh cả tiền nhập hàng
(stock-in) qua sổ kho. Hai góc nhìn tách biệt: lãi bán hàng (dồn tích) và dòng
tiền kho (tiền mặt, gồm cả vốn đọng trong kho chưa bán).
"""


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


def _summary(client, headers) -> dict:
    return client.get("/api/orders/profit-summary", headers=headers).json()["data"]


def test_profit_summary_exposes_warehouse_cashflow_fields(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    data = _summary(client, headers)
    # Các trường dòng tiền kho phải có mặt (kể cả khi 0).
    for key in ("ledger_cash_in", "ledger_cash_out", "stock_in_cost", "net_cashflow"):
        assert key in data, f"thiếu trường {key} trong profit-summary"


def test_stock_in_increases_stock_in_cost_and_drags_cashflow(client, admin_token, admin_org_id):
    """Nhập kho (chưa bán) -> tăng tiền nhập hàng + kéo dòng tiền ròng xuống."""
    headers = _auth(admin_token, admin_org_id)
    prod = _new_product(client, headers, "SP nhập kho lãi", base_price="20000")

    before = _summary(client, headers)
    client.post(
        "/api/inventory/stock-in",
        headers=headers,
        json={"product_id": prod["id"], "quantity": 10},
    )
    after = _summary(client, headers)

    # Nhập 10 × 20000 = 200000 vào CHI (tiền nhập hàng).
    assert float(after["stock_in_cost"]) - float(before["stock_in_cost"]) == 200000
    assert float(after["ledger_cash_out"]) - float(before["ledger_cash_out"]) == 200000
    # Dòng tiền ròng giảm đúng 200000 vì hàng chưa bán (vốn đọng trong kho).
    assert float(after["net_cashflow"]) - float(before["net_cashflow"]) == -200000
    # Lãi bán hàng (dồn tích) KHÔNG đổi: chưa bán gì.
    assert after["owner_profit"] == before["owner_profit"]


def test_full_buy_then_sell_cycle_reflected_in_cashflow(client, admin_token, admin_org_id):
    """Nhập rồi bán: dòng tiền ròng = doanh thu − giá nhập; lãi bán hàng = sale − vốn."""
    headers = _auth(admin_token, admin_org_id)
    # markup 50% -> sale_price = 20000 × 1.5 = 30000.
    prod = _new_product(client, headers, "SP nhập-bán", base_price="20000", markup_percent="50")
    _topup(client, headers)

    before = _summary(client, headers)
    client.post(
        "/api/inventory/stock-in",
        headers=headers,
        json={"product_id": prod["id"], "quantity": 5},
    )
    client.post("/api/orders", headers=headers, json={"product_id": prod["id"], "quantity": 2})
    after = _summary(client, headers)

    # Dòng tiền kho: CHI nhập 5×20000=100000, THU bán 2×30000=60000 -> ròng = -40000.
    assert float(after["stock_in_cost"]) - float(before["stock_in_cost"]) == 100000
    assert float(after["ledger_cash_in"]) - float(before["ledger_cash_in"]) == 60000
    assert float(after["net_cashflow"]) - float(before["net_cashflow"]) == -40000

    # Lãi bán hàng (dồn tích) chỉ tính 2 sp đã bán: (30000-20000)×2 = 20000.
    assert float(after["owner_profit"]) - float(before["owner_profit"]) == 20000
    assert float(after["profit"]) - float(before["profit"]) == 20000


def test_date_range_filters_warehouse_cashflow(client, admin_token, admin_org_id):
    """Lọc khoảng ngày tương lai -> không có dòng tiền kho nào lọt vào."""
    headers = _auth(admin_token, admin_org_id)
    prod = _new_product(client, headers, "SP lọc ngày", base_price="10000")
    client.post(
        "/api/inventory/stock-in",
        headers=headers,
        json={"product_id": prod["id"], "quantity": 3},
    )
    res = client.get(
        "/api/orders/profit-summary",
        headers=headers,
        params={"from_date": "2099-01-01", "to_date": "2099-12-31"},
    )
    data = res.json()["data"]
    assert float(data["stock_in_cost"]) == 0
    assert float(data["net_cashflow"]) == 0
