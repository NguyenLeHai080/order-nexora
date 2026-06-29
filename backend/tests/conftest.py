"""Fixtures dùng chung cho test: app client + DB SQLite riêng cho test."""
import os
import tempfile

import pytest
from fastapi.testclient import TestClient

# Dùng DB tạm riêng cho test, không đụng DB dev.
_tmp_db = os.path.join(tempfile.gettempdir(), "order_nexora_test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db}"


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    # Xóa DB cũ nếu có, rồi seed dữ liệu khởi tạo.
    if os.path.exists(_tmp_db):
        os.remove(_tmp_db)

    import app.database  # noqa: F401
    from app.core.database import Base, engine
    from app.seed import seed

    Base.metadata.create_all(bind=engine)
    seed()
    yield
    if os.path.exists(_tmp_db):
        try:
            os.remove(_tmp_db)
        except PermissionError:
            pass


@pytest.fixture
def client(_setup_db) -> TestClient:
    from app.main import app

    return TestClient(app)


@pytest.fixture
def admin_token(client: TestClient) -> str:
    res = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "password"})
    assert res.status_code == 200, res.text
    return res.json()["data"]["access_token"]


@pytest.fixture
def admin_org_id(client: TestClient) -> int:
    res = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "password"})
    return res.json()["data"]["current_organization_id"]
