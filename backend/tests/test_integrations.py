"""Test framework tích hợp đa nhà cung cấp (registry + driver + capability).

Bao phủ: registry (register/get/unknown/capability), validate driver động ở
schema, Supplier.config + cfg(), và Cazy client qua httpx mock (auth headers,
account/balance/list_domains, funnel lỗi). Không gọi mạng thật.
"""
from __future__ import annotations

import httpx
import pytest

from app.integrations import registry
from app.integrations.cazyserver.client import CazyClient
from app.integrations.errors import UnknownDriverError

# ---- Registry & capability ------------------------------------------------


def test_registry_has_builtin_drivers():
    drivers = set(registry.list_drivers())
    assert {"vdstore", "cazyserver"} <= drivers


def test_registry_get_unknown_raises():
    with pytest.raises(UnknownDriverError):
        registry.get("khong-ton-tai")


def test_has_capability_matrix():
    # VD Store: sản phẩm số có webhook + orders.
    assert registry.has_capability("vdstore", "orders") is True
    assert registry.has_capability("vdstore", "webhook") is True
    # Cazy: domain, KHÔNG webhook/orders.
    assert registry.has_capability("cazyserver", "domains") is True
    assert registry.has_capability("cazyserver", "webhook") is False
    assert registry.has_capability("cazyserver", "orders") is False
    # Driver lạ / manual -> False, không raise.
    assert registry.has_capability("manual", "orders") is False


def test_descriptor_shape_for_frontend():
    desc = registry.descriptor("cazyserver").to_dict()
    assert desc["key"] == "cazyserver"
    assert desc["has_webhook"] is False
    keys = {f["key"] for f in desc["fields"]}
    assert {"api_key", "api_secret"} <= keys
    # Field secret không bao giờ kèm giá trị, chỉ metadata.
    for f in desc["fields"]:
        assert "key" in f and "type" in f


# ---- Supplier.config + cfg() ---------------------------------------------


def test_supplier_cfg_reads_json_config():
    from app.modules.suppliers.models import Supplier

    s = Supplier(name="Cazy demo", driver="cazyserver", config={"api_key": "k", "api_secret": "s"})
    assert s.cfg("api_key") == "k"
    assert s.cfg("api_secret") == "s"
    assert s.cfg("missing", "default") == "default"

    empty = Supplier(name="X", driver="manual")
    assert empty.cfg("api_key") is None


# ---- Cazy client qua httpx mock ------------------------------------------


def _mock_client(handler):
    """Trả factory httpx.Client gắn MockTransport (thay cho httpx.Client thật)."""
    transport = httpx.MockTransport(handler)
    real_client = httpx.Client  # giữ class gốc trước khi monkeypatch.

    def factory(*args, **kwargs):
        kwargs.pop("timeout", None)
        return real_client(transport=transport)

    return factory


def test_cazy_auth_headers_and_balance(monkeypatch):
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["headers"] = request.headers
        captured["url"] = str(request.url)
        return httpx.Response(200, json={"currency": "USD", "balance": 42.5})

    monkeypatch.setattr("app.integrations.base.httpx.Client", _mock_client(handler))

    client = CazyClient(api_key="my-key", api_secret="my-secret", base_url="https://cazy.test/api")
    balance = client.get_balance()

    assert captured["headers"]["X-API-Key"] == "my-key"
    assert captured["headers"]["X-API-Secret"] == "my-secret"
    assert captured["url"].endswith("/account/balance")

    data = client.map_balance(balance)
    assert data == {"currency": "USD", "balance": "42.5", "livemode": True}


def test_cazy_list_domains(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"data": [{"domain": "abc.com", "status": "active", "locked": True}], "total": 1},
        )

    monkeypatch.setattr("app.integrations.base.httpx.Client", _mock_client(handler))

    client = CazyClient(api_key="k", api_secret="s", base_url="https://cazy.test/api")
    result = client.list_domains()
    assert result.total == 1
    assert result.data[0].domain == "abc.com"
    assert result.data[0].locked is True


def test_cazy_error_funnel(monkeypatch):
    from app.integrations.cazyserver.errors import CazyError

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(402, json={"code": "insufficient_funds", "message": "Hết tiền"})

    monkeypatch.setattr("app.integrations.base.httpx.Client", _mock_client(handler))

    client = CazyClient(api_key="k", api_secret="s", base_url="https://cazy.test/api")
    with pytest.raises(CazyError) as exc:
        client.get_balance()
    assert exc.value.code == "insufficient_funds"
    # Map sang AppException với HTTP status nghiệp vụ.
    app_exc = exc.value.to_app_exception()
    assert app_exc.status_code == 402


def test_cazy_missing_credentials_raises():
    from app.integrations.cazyserver.errors import CazyError

    with pytest.raises(CazyError):
        CazyClient(api_key="", api_secret="", base_url="https://cazy.test/api")
