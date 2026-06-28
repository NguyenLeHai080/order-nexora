"""Test multi-org context + RBAC: tạo user role 'user' và kiểm tra bị chặn quyền."""
from fastapi.testclient import TestClient


def _auth(token: str, org_id: int) -> dict:
    return {"Authorization": f"Bearer {token}", "X-Organization-Id": str(org_id)}


def test_admin_can_create_user(client: TestClient, admin_token: str, admin_org_id: int):
    res = client.post(
        "/api/users",
        headers=_auth(admin_token, admin_org_id),
        json={
            "name": "Khách A",
            "email": "khacha@example.com",
            "password": "password",
            "role_ids": [],
            "organization_ids": [admin_org_id],
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["data"]["email"] == "khacha@example.com"


def test_normal_user_forbidden_on_users_index(client: TestClient, admin_token: str, admin_org_id: int):
    # Tạo user thường (chưa gán role admin) và đăng nhập.
    client.post(
        "/api/users",
        headers=_auth(admin_token, admin_org_id),
        json={
            "name": "Khách B",
            "email": "khachb@example.com",
            "password": "password",
            "organization_ids": [admin_org_id],
        },
    )
    login = client.post("/api/auth/login", json={"email": "khachb@example.com", "password": "password"})
    token = login.json()["data"]["access_token"]

    # Không có quyền users.index -> 403.
    res = client.get("/api/users", headers=_auth(token, admin_org_id))
    assert res.status_code == 403
    assert res.json()["success"] is False


def test_missing_token_unauthorized(client: TestClient, admin_org_id: int):
    res = client.get("/api/users", headers={"X-Organization-Id": str(admin_org_id)})
    assert res.status_code == 401
