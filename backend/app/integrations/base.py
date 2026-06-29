"""Khung cơ sở cho mọi driver nhà cung cấp.

`BaseProviderClient` giữ phần transport dùng chung (httpx + funnel lỗi). Mỗi driver
con override `auth_headers()`, `from_supplier()`, `descriptor()` và cài các method
theo capability mà nó hỗ trợ.

Capability được khai báo 2 nơi (phải khớp nhau):
- `descriptor().capabilities` — NGUỒN SỰ THẬT, router & frontend đọc để bật/tắt
  tính năng và render field cấu hình động.
- Các `Supports*` Protocol — dùng cho dispatch/kiểm tra ở tầng service.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

import httpx

from app.integrations.errors import ProviderError

_TIMEOUT = httpx.Timeout(20.0, connect=10.0)


@dataclass(frozen=True)
class ConfigField:
    """Một trường cấu hình mà modal frontend cần render cho driver."""

    key: str  # khóa trong Supplier.config (hoặc tên cột cố định)
    label: str
    type: str = "text"  # text | password | select | url
    required: bool = False
    secret: bool = False  # không bao giờ trả giá trị ra FE, chỉ cờ "đã cấu hình"
    env_scoped: bool = False  # render riêng theo từng môi trường (test/live)
    options: list[str] | None = None
    placeholder: str | None = None

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "label": self.label,
            "type": self.type,
            "required": self.required,
            "secret": self.secret,
            "env_scoped": self.env_scoped,
            "options": self.options,
            "placeholder": self.placeholder,
        }


@dataclass(frozen=True)
class DriverDescriptor:
    """Mô tả tĩnh của một driver — frontend đọc để render picker + modal động."""

    key: str  # "vdstore" | "cazyserver"
    label: str
    capabilities: list[str] = field(default_factory=list)
    fields: list[ConfigField] = field(default_factory=list)
    has_webhook: bool = False
    default_endpoint: str | None = None
    supports_environments: bool = True

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "label": self.label,
            "capabilities": list(self.capabilities),
            "fields": [f.to_dict() for f in self.fields],
            "has_webhook": self.has_webhook,
            "default_endpoint": self.default_endpoint,
            "supports_environments": self.supports_environments,
        }


class BaseProviderClient:
    """Transport dùng chung cho mọi driver (httpx + funnel lỗi)."""

    driver: str = ""
    default_base_url: str | None = None
    error_cls: type[ProviderError] = ProviderError

    def __init__(self, *, base_url: str | None = None, timeout: httpx.Timeout | None = None):
        self._base_url = (base_url or self.default_base_url or "").rstrip("/")
        self._timeout = timeout or _TIMEOUT

    # ---- Hooks driver con override ----------------------------------------

    @classmethod
    def from_supplier(cls, supplier) -> BaseProviderClient:
        """Dựng client từ một bản ghi Supplier. Driver con phải override."""
        raise NotImplementedError

    @classmethod
    def descriptor(cls) -> DriverDescriptor:
        """Mô tả driver cho frontend. Driver con phải override."""
        raise NotImplementedError

    def auth_headers(self) -> dict:
        """Header xác thực riêng của driver (Bearer, X-API-Key...). Base: rỗng."""
        return {}

    # ---- Transport dùng chung ---------------------------------------------

    def _headers(self, extra: dict | None = None) -> dict:
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        headers.update(self.auth_headers())
        if extra:
            headers.update(extra)
        return headers

    def _request(self, method: str, path: str, *, headers: dict | None = None, **kwargs) -> dict:
        """Gọi HTTP và trả JSON; lỗi gói thành self.error_cls.

        Không log API key. Chỉ log code/requestId khi lỗi (do caller xử lý).
        """
        url = f"{self._base_url}/{path.lstrip('/')}"
        try:
            with httpx.Client(timeout=self._timeout) as client:
                resp = client.request(method, url, headers=self._headers(headers), **kwargs)
        except httpx.TimeoutException as exc:
            raise self.error_cls("request_timeout", "Hết thời gian chờ nhà cung cấp.") from exc
        except httpx.HTTPError as exc:
            raise self.error_cls("request_failed", "Không kết nối được tới nhà cung cấp.") from exc

        if resp.status_code >= 400:
            try:
                payload = resp.json()
            except ValueError:
                payload = {}
            raise self.error_cls.from_problem(payload, resp.status_code)

        try:
            return resp.json()
        except ValueError as exc:
            raise self.error_cls(
                "invalid_response", "Nhà cung cấp trả về dữ liệu không hợp lệ."
            ) from exc


# ---- Capability protocols -------------------------------------------------


@runtime_checkable
class SupportsCatalog(Protocol):
    def get_catalog(self): ...

    def map_catalog_product(self, product) -> dict: ...


@runtime_checkable
class SupportsBalance(Protocol):
    def get_balance(self): ...

    def map_balance(self, balance) -> dict: ...


@runtime_checkable
class SupportsOrders(Protocol):
    def create_order(self, *, external_order_id: str, items: list[dict], idempotency_key: str): ...

    def get_order(self, order_id: str): ...

    def map_order_to_internal(self, order) -> dict: ...


@runtime_checkable
class SupportsWebhook(Protocol):
    def verify_webhook(
        self, *, raw_body: bytes | str, signature_header: str, secret: str, now_ts: int
    ) -> bool: ...

    def parse_webhook(self, raw_body: bytes | str): ...

    def webhook_signature_header(self) -> str: ...

    def webhook_event_id_header(self) -> str: ...


@runtime_checkable
class SupportsDomains(Protocol):
    def get_account(self): ...

    def list_domains(self, **kwargs): ...
