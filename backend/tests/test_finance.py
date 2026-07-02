"""Test module Finance: sổ cái ví, phiếu thu/chi, rút tiền, công nợ NCC, overview.

Kiểm chứng post_wallet_txn ghi đúng dấu vết cho nạp/mua/hoàn/lãi chủ, và các
luồng tài chính mới (cash entry, withdrawal, settlement).
"""
from decimal import Decimal

from app.core.database import SessionLocal
from app.modules.settings import service as settings_service


def _auth(token: str, org_id: int) -> dict:
    return {"Authorization": f"Bearer {token}", "X-Organization-Id": str(org_id)}


def _new_product(client, headers, name, *, base_price="10000", regular_price="20000") -> dict:
    return client.post(
        "/api/products",
        headers=headers,
        json={"name": name, "base_price": base_price, "regular_price": regular_price, "markup_percent": "0"},
    ).json()["data"]


def _topup(client, headers, amount="1000000") -> int:
    me = client.get("/api/user", headers=headers).json()["data"]["user"]
    client.post(f"/api/users/{me['id']}/balance", headers=headers, json={"amount": amount})
    return me["id"]


def _balance(client, headers) -> Decimal:
    return Decimal(str(client.get("/api/user", headers=headers).json()["data"]["balance"]))


def _stock_in(client, headers, product_id, qty=100) -> None:
    client.post("/api/inventory/stock-in", headers=headers,
                json={"product_id": product_id, "quantity": qty, "reason": "Nhập test"})


def _patch_vd_success(monkeypatch):
    from app.modules.orders import service as order_service

    def fake(db, order, product):
        return order_service._Delivery(status="success", content="[TEST] delivered")

    monkeypatch.setattr(order_service, "_fetch_from_supplier", fake)


def test_admin_topup_writes_ledger(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    uid = _topup(client, headers, "500000")
    res = client.get("/api/finance/wallet", headers=headers, params={"user_id": uid, "type": "adjustment"})
    assert res.status_code == 200, res.text
    rows = res.json()["data"]
    assert any(r["type"] == "adjustment" and r["direction"] == "in" for r in rows)
    # balance_after khớp số dư hiện tại.
    top = rows[0]
    assert Decimal(top["balance_after"]) == _balance(client, headers)


def test_purchase_and_cancel_ledger(client, admin_token, admin_org_id, monkeypatch):
    headers = _auth(admin_token, admin_org_id)
    _patch_vd_success(monkeypatch)
    prod = _new_product(client, headers, "SP finance ledger")
    _stock_in(client, headers, prod["id"])
    uid = _topup(client, headers)

    order = client.post("/api/orders", headers=headers,
                        json={"product_id": prod["id"], "quantity": 2}).json()["data"]
    assert order["status"] == "success"

    # Có dòng purchase out cho người mua.
    wallet = client.get("/api/finance/wallet", headers=headers, params={"user_id": uid}).json()["data"]
    assert any(r["type"] == "purchase" and r["direction"] == "out" for r in wallet)
    # Có dòng owner_profit in cho ví chủ (admin chính là owner mặc định).
    owner_rows = client.get("/api/finance/wallet", headers=headers, params={"type": "owner_profit"}).json()["data"]
    assert any(r["direction"] == "in" for r in owner_rows)

    # Hủy đơn -> dòng refund in.
    client.post(f"/api/orders/{order['id']}/cancel", headers=headers)
    wallet = client.get("/api/finance/wallet", headers=headers, params={"user_id": uid, "type": "refund"}).json()["data"]
    assert any(r["direction"] == "in" for r in wallet)


def test_cash_entries_and_overview(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    client.post("/api/finance/cash-entries", headers=headers,
                json={"kind": "income", "amount": "300000", "category": "Khác", "occurred_on": "2026-06-01"})
    client.post("/api/finance/cash-entries", headers=headers,
                json={"kind": "expense", "amount": "100000", "category": "Thuê", "occurred_on": "2026-06-02"})
    ov = client.get("/api/finance/overview", headers=headers).json()["data"]
    assert Decimal(ov["cash_income"]) >= Decimal("300000")
    assert Decimal(ov["cash_expense"]) >= Decimal("100000")
    assert Decimal(ov["cash_net"]) == Decimal(ov["cash_income"]) - Decimal(ov["cash_expense"])


def test_withdrawal_flow_and_guard(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    uid = _topup(client, headers, "200000")

    # Tạo yêu cầu rút vượt số dư -> chặn.
    over = client.post("/api/finance/withdrawals", headers=headers,
                       json={"user_id": uid, "amount": "999999999"})
    assert over.status_code == 400

    wr = client.post("/api/finance/withdrawals", headers=headers,
                     json={"user_id": uid, "amount": "50000", "bank_info": "VCB 123"}).json()["data"]
    assert wr["status"] == "pending"

    before = _balance(client, headers)
    paid = client.post(f"/api/finance/withdrawals/{wr['id']}/pay", headers=headers).json()["data"]
    assert paid["status"] == "paid"
    after = _balance(client, headers)
    assert before - after == Decimal("50000")

    # Có dòng withdrawal out.
    rows = client.get("/api/finance/wallet", headers=headers, params={"user_id": uid, "type": "withdrawal"}).json()["data"]
    assert any(r["direction"] == "out" for r in rows)

    # Không thể pay lại.
    again = client.post(f"/api/finance/withdrawals/{wr['id']}/pay", headers=headers)
    assert again.status_code == 400


def test_supplier_debt_and_settlement(client, admin_token, admin_org_id, monkeypatch):
    headers = _auth(admin_token, admin_org_id)
    _patch_vd_success(monkeypatch)
    _topup(client, headers)

    # Tạo NCC + sản phẩm gắn NCC để sinh supplier_payable khi bán.
    supplier = client.post("/api/suppliers", headers=headers,
                           json={"name": "NCC Finance TEST", "driver": "manual"}).json()["data"]
    prod = client.post("/api/products", headers=headers, json={
        "name": "SP NCC finance", "base_price": "8000", "regular_price": "20000",
        "markup_percent": "0", "supplier_id": supplier["id"],
    }).json()["data"]
    _stock_in(client, headers, prod["id"])
    order = client.post("/api/orders", headers=headers,
                        json={"product_id": prod["id"], "quantity": 3}).json()["data"]
    assert order["status"] == "success"

    debt = client.get("/api/finance/supplier-debt", headers=headers).json()["data"]
    row = next((d for d in debt if d["supplier_id"] == supplier["id"]), None)
    assert row is not None
    outstanding0 = Decimal(row["outstanding"])
    assert outstanding0 > 0

    # Ghi tất toán 1 phần -> outstanding giảm đúng.
    client.post("/api/finance/settlements", headers=headers,
                json={"supplier_id": supplier["id"], "amount": "10000", "note": "Trả đợt 1"})
    debt2 = client.get("/api/finance/supplier-debt", headers=headers).json()["data"]
    row2 = next(d for d in debt2 if d["supplier_id"] == supplier["id"])
    assert Decimal(row2["outstanding"]) == outstanding0 - Decimal("10000")


def test_wallet_me_only_self(client, admin_token, admin_org_id):
    headers = _auth(admin_token, admin_org_id)
    _topup(client, headers, "10000")
    res = client.get("/api/finance/wallet/me", headers=headers)
    assert res.status_code == 200, res.text
    me = client.get("/api/user", headers=headers).json()["data"]["user"]
    for row in res.json()["data"]:
        assert row["user_id"] == me["id"]
