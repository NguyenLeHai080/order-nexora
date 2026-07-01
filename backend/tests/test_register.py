"""Test self-signup /api/auth/register — auto-login + KHÔNG leo thang quyền."""


def test_register_creates_low_priv_user_and_auto_login(client):
    res = client.post(
        "/api/auth/register",
        json={"name": "Khách Mới", "email": "khachmoi@example.com", "password": "secret123"},
    )
    assert res.status_code == 201, res.text
    data = res.json()["data"]
    # Auto-login: có token.
    assert data["access_token"]
    assert data["user"]["name"] == "Khách Mới"
    # BẢO MẬT: chỉ role 'user', KHÔNG có admin/ctv.
    assert "admin" not in data["roles"]
    assert "ctv" not in data["roles"]
    assert data["roles"] == ["user"] or "user" in data["roles"]
    # Quyền thấp: không có quyền quản trị.
    assert "users.store" not in data["permissions"]
    assert "products.store" not in data["permissions"]


def test_register_token_cannot_access_admin_endpoints(client):
    res = client.post(
        "/api/auth/register",
        json={"name": "Khách 2", "email": "khach2@example.com", "password": "secret123"},
    )
    token = res.json()["data"]["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    # Tạo sản phẩm (cần products.store) -> phải bị chặn 403.
    res = client.post("/api/products", json={"name": "Hack", "base_price": 1}, headers=h)
    assert res.status_code == 403, res.text
    # Liệt kê user (cần users.index) -> chặn.
    res = client.get("/api/users", headers=h)
    assert res.status_code == 403


def test_register_duplicate_email_rejected(client):
    payload = {"name": "Trùng", "email": "trungemail@example.com", "password": "secret123"}
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201, res.text
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 422


def test_register_then_login_works(client):
    client.post(
        "/api/auth/register",
        json={"name": "Login Lại", "email": "loginlai@example.com", "password": "secret123"},
    )
    res = client.post(
        "/api/auth/login",
        json={"email": "loginlai@example.com", "password": "secret123"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["data"]["access_token"]
