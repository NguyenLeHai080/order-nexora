"""Test luồng Auth: login, /user, abilities, sai mật khẩu."""
from fastapi.testclient import TestClient


def test_login_success(client: TestClient):
    res = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "password"})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    data = body["data"]
    assert data["access_token"]
    assert data["token_type"] == "Bearer"
    assert "admin" in data["roles"]
    # Admin có toàn bộ permissions -> abilities không rỗng.
    assert len(data["abilities"]) > 0
    assert data["current_organization_id"] is not None


def test_login_wrong_password(client: TestClient):
    res = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "sai"})
    assert res.status_code == 401
    assert res.json()["success"] is False


def test_login_with_username(client: TestClient):
    # Đăng nhập bằng user_name thay vì email.
    res = client.post("/api/auth/login", json={"email": "admin", "password": "password"})
    assert res.status_code == 200


def test_get_current_user(client: TestClient, admin_token: str, admin_org_id: int):
    res = client.get(
        "/api/user",
        headers={"Authorization": f"Bearer {admin_token}", "X-Organization-Id": str(admin_org_id)},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["user"]["name"] == "Admin"
    assert "admin" in data["roles"]


def test_unauthenticated_blocked(client: TestClient):
    res = client.get("/api/users")
    assert res.status_code == 401
