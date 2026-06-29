"""HTTP client gọi Cazyserver reseller domain API.

Auth bằng cặp header `X-API-Key` + `X-API-Secret` (theo tài liệu tóm tắt). Biến
thể `Authorization: Basic base64(key:secret)` để dành khi xác nhận với credential
thật. Transport dùng chung kế thừa BaseProviderClient.

Trạng thái: account/balance/list_domains implement đầy đủ (test được qua mock).
register_domain/renew_domain/nameserver/transfer-lock là SCAFFOLD — signature +
transport sẵn, chờ xác nhận shape request/response thật trước khi nối vào nghiệp vụ.
Mô hình đăng ký tên miền KHÔNG khớp Order/Product hiện tại nên chưa nối fulfillment.
"""
from __future__ import annotations

import httpx

from app.integrations.base import BaseProviderClient, ConfigField, DriverDescriptor
from app.integrations.cazyserver import mapper
from app.integrations.cazyserver.errors import CazyError
from app.integrations.cazyserver.schemas import (
    CazyAccount,
    CazyBalance,
    CazyDomainList,
)

_DEFAULT_BASE_URL = "https://cazyserver.com/modules/addons/reseller_manager/api.php"


class CazyClient(BaseProviderClient):
    """Client cho Cazyserver reseller domain API."""

    driver = "cazyserver"
    default_base_url = _DEFAULT_BASE_URL
    error_cls = CazyError

    def __init__(
        self,
        *,
        api_key: str,
        api_secret: str,
        base_url: str | None = None,
        timeout: httpx.Timeout | None = None,
    ):
        if not api_key or not api_secret:
            raise CazyError("missing_credentials", "Chưa cấu hình API key/secret cho nhà cung cấp.")
        self._api_key = api_key
        self._api_secret = api_secret
        super().__init__(base_url=base_url, timeout=timeout)

    # ---- Factory & descriptor ---------------------------------------------

    @classmethod
    def from_supplier(cls, supplier) -> CazyClient:
        """Tạo client từ Supplier — đọc api_key/api_secret trong cột JSON config."""
        return cls(
            api_key=supplier.cfg("api_key"),
            api_secret=supplier.cfg("api_secret"),
            base_url=supplier.api_endpoint,
        )

    @classmethod
    def descriptor(cls) -> DriverDescriptor:
        return DriverDescriptor(
            key=cls.driver,
            label="Cazyserver",
            capabilities=["account", "balance", "domains"],
            fields=[
                ConfigField("api_endpoint", "Base URL", type="url",
                            placeholder=_DEFAULT_BASE_URL),
                ConfigField("api_key", "API Key", type="password", required=True, secret=True),
                ConfigField("api_secret", "API Secret", type="password", required=True, secret=True),
            ],
            has_webhook=False,
            default_endpoint=_DEFAULT_BASE_URL,
            supports_environments=False,
        )

    def auth_headers(self) -> dict:
        return {"X-API-Key": self._api_key, "X-API-Secret": self._api_secret}

    # ---- Account & balance (implement đầy đủ) -----------------------------

    def get_account(self) -> CazyAccount:
        """GET /account — thông tin tài khoản reseller."""
        return CazyAccount.model_validate(self._request("GET", "/account"))

    def get_balance(self) -> CazyBalance:
        """GET /account/balance — số dư tín dụng."""
        return CazyBalance.model_validate(self._request("GET", "/account/balance"))

    def map_balance(self, balance: CazyBalance) -> dict:
        return mapper.balance_to_internal(balance)

    # ---- Domains ----------------------------------------------------------

    def list_domains(self, **params) -> CazyDomainList:
        """GET /domains — danh sách tên miền."""
        return CazyDomainList.model_validate(self._request("GET", "/domains", params=params or None))

    # ---- Scaffold: chờ xác nhận shape thật trước khi nối nghiệp vụ ---------

    def register_domain(self, *, sld: str, tld: str, years: int = 1,
                        ns1: str | None = None, ns2: str | None = None) -> dict:
        """POST /domains — đăng ký tên miền. (Scaffold)"""
        body: dict = {"sld": sld, "tld": tld, "years": years}
        if ns1:
            body["ns1"] = ns1
        if ns2:
            body["ns2"] = ns2
        return self._request("POST", "/domains", json=body)

    def renew_domain(self, domain: str, *, years: int = 1) -> dict:
        """POST /domains/{domain}/renew — gia hạn. (Scaffold)"""
        return self._request("POST", f"/domains/{domain}/renew", json={"years": years})

    def get_nameservers(self, domain: str) -> dict:
        """GET /domains/{domain}/nameservers. (Scaffold)"""
        return self._request("GET", f"/domains/{domain}/nameservers")

    def update_nameservers(self, domain: str, nameservers: list[str]) -> dict:
        """PUT /domains/{domain}/nameservers. (Scaffold)"""
        return self._request("PUT", f"/domains/{domain}/nameservers", json={"nameservers": nameservers})

    def get_lock(self, domain: str) -> dict:
        """GET /domains/{domain}/lock. (Scaffold)"""
        return self._request("GET", f"/domains/{domain}/lock")

    def update_lock(self, domain: str, *, locked: bool) -> dict:
        """PUT /domains/{domain}/lock. (Scaffold)"""
        return self._request("PUT", f"/domains/{domain}/lock", json={"locked": locked})
