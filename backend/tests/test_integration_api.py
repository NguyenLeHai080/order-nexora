"""Test API tích hợp đa NCC qua HTTP (drivers list, config, gating, product filter)."""
from fastapi.testclient import TestClient


def _auth(token: str, org_id: int) -> dict:
    return {"Authorization": f"Bearer {token}", "X-Organization-Id": str(org_id)}


def test_list_drivers_endpoint(client: TestClient, admin_token: str, admin_org_id: int):
    res = client.get("/api/partner/drivers", headers=_auth(admin_token, admin_org_id))
    assert res.status_code == 200, res.text
    keys = {d["key"] for d in res.json()["data"]}
    assert {"vdstore", "cazyserver"} <= keys


def test_create_cazy_supplier_hides_secrets(client: TestClient, admin_token: str, admin_org_id: int):
    headers = _auth(admin_token, admin_org_id)
    res = client.post(
        "/api/suppliers",
        headers=headers,
        json={
            "name": "Cazy CTV",
            "driver": "cazyserver",
            "api_endpoint": "https://cazyserver.com/api.php",
            "config": {"api_key": "secret-key", "api_secret": "secret-val"},
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()["data"]
    # Không lộ secret; chỉ trả cờ configured.
    assert "config" not in data
    assert data["configured"]["api_key"] is True
    assert data["configured"]["api_secret"] is True


def test_invalid_driver_rejected(client: TestClient, admin_token: str, admin_org_id: int):
    res = client.post(
        "/api/suppliers",
        headers=_auth(admin_token, admin_org_id),
        json={"name": "Lạ", "driver": "khong-ton-tai"},
    )
    assert res.status_code == 422, res.text


def test_cazy_webhook_not_supported(client: TestClient, admin_token: str, admin_org_id: int):
    headers = _auth(admin_token, admin_org_id)
    sup = client.post(
        "/api/suppliers",
        headers=headers,
        json={
            "name": "Cazy WH",
            "driver": "cazyserver",
            "config": {"api_key": "k", "api_secret": "s"},
        },
    ).json()["data"]
    # Cazy không có webhook -> 4xx rõ ràng.
    res = client.post(f"/api/partner/{sup['id']}/webhook", headers=headers, content=b"{}")
    assert res.status_code >= 400
    assert res.json()["success"] is False


def test_product_supplier_filter(client: TestClient, admin_token: str, admin_org_id: int):
    headers = _auth(admin_token, admin_org_id)
    sup = client.post(
        "/api/suppliers",
        headers=headers,
        json={"name": "NCC Lọc", "driver": "manual"},
    ).json()["data"]
    client.post(
        "/api/products",
        headers=headers,
        json={"name": "SP của NCC", "base_price": "1000", "supplier_id": sup["id"]},
    )
    res = client.get(f"/api/products?supplier_id={sup['id']}", headers=headers)
    assert res.status_code == 200, res.text
    rows = res.json()["data"]
    assert len(rows) >= 1
    assert all(r["supplier_id"] == sup["id"] for r in rows)
    assert rows[0]["supplier_name"] == "NCC Lọc"
