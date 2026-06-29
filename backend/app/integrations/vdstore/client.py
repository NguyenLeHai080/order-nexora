"""HTTP client gọi VD Store Partner API.

Dựng từ một bản ghi Supplier (driver=vdstore): lấy base URL + API key theo
môi trường (test/live). Biết shape thật của VD; trả về DTO trong schemas.py.
Lỗi HTTP/problem+json được gói thành VDStoreError.

Transport dùng chung kế thừa từ BaseProviderClient; ở đây chỉ khai báo auth
(Bearer), các endpoint VD, webhook wrappers và descriptor cho frontend.

Bảo mật: không log API key. Chỉ log code/requestId khi lỗi.
"""
from __future__ import annotations

import httpx

from app.integrations.base import BaseProviderClient, ConfigField, DriverDescriptor
from app.integrations.vdstore import mapper
from app.integrations.vdstore.errors import VDStoreError
from app.integrations.vdstore.schemas import (
    VDBalance,
    VDCatalog,
    VDOrder,
    VDOrderList,
)
from app.integrations.vdstore.webhook import parse_event, verify_signature

_DEFAULT_BASE_URL = "https://api.vanhdao.io.vn/partner/v1"


class VDStoreClient(BaseProviderClient):
    """Client mỏng quanh httpx cho VD Store Partner API."""

    driver = "vdstore"
    default_base_url = _DEFAULT_BASE_URL
    error_cls = VDStoreError

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: httpx.Timeout | None = None,
    ):
        # KHÔNG bắt buộc api_key ở đây: webhook (inbound) chỉ cần secret để verify
        # chữ ký, không cần key. Key chỉ bắt buộc khi gọi API ra ngoài -> kiểm tra
        # trong auth_headers() (mọi request authed đều đi qua đó).
        self._api_key = api_key
        super().__init__(base_url=base_url, timeout=timeout)

    # ---- Factory & descriptor ---------------------------------------------

    @classmethod
    def from_supplier(cls, supplier) -> VDStoreClient:
        """Tạo client từ Supplier (dùng active_api_key + api_endpoint theo môi trường)."""
        return cls(api_key=supplier.active_api_key, base_url=supplier.api_endpoint)

    @classmethod
    def descriptor(cls) -> DriverDescriptor:
        return DriverDescriptor(
            key=cls.driver,
            label="VD Store",
            capabilities=["catalog", "balance", "orders", "webhook", "livemode"],
            fields=[
                ConfigField("api_endpoint", "Partner API endpoint", type="url",
                            placeholder=_DEFAULT_BASE_URL),
                ConfigField("api_key_test", "API key test", type="password",
                            secret=True, env_scoped=True, placeholder="vd_test_..."),
                ConfigField("api_key_live", "API key live", type="password",
                            secret=True, env_scoped=True, placeholder="vd_live_..."),
            ],
            has_webhook=True,
            default_endpoint=_DEFAULT_BASE_URL,
            supports_environments=True,
        )

    def auth_headers(self) -> dict:
        if not self._api_key:
            raise VDStoreError("missing_api_key", "Chưa cấu hình API key cho nhà cung cấp.")
        return {"Authorization": f"Bearer {self._api_key}"}

    # ---- Endpoints --------------------------------------------------------

    def get_catalog(self) -> VDCatalog:
        """GET /catalog — catalog, giá CTV, tồn kho."""
        return VDCatalog.model_validate(self._request("GET", "/catalog"))

    def get_balance(self) -> VDBalance:
        """GET /balance — số dư ví CTV."""
        return VDBalance.model_validate(self._request("GET", "/balance"))

    def create_order(
        self,
        *,
        external_order_id: str,
        items: list[dict],
        idempotency_key: str,
        voucher_code: str | None = None,
    ) -> VDOrder:
        """POST /orders — tạo đơn (bắt buộc Idempotency-Key).

        items: [{"productId": str, "quantity": int}, ...] (tối đa 20).
        """
        body: dict = {"externalOrderId": external_order_id, "items": items}
        if voucher_code:
            body["voucherCode"] = voucher_code
        data = self._request(
            "POST",
            "/orders",
            json=body,
            headers={"Idempotency-Key": idempotency_key},
        )
        return VDOrder.model_validate(data)

    def get_order(self, order_id: str) -> VDOrder:
        """GET /orders/:id — chi tiết đơn."""
        return VDOrder.model_validate(self._request("GET", f"/orders/{order_id}"))

    def list_orders(self, *, limit: int = 50, cursor: str | None = None) -> VDOrderList:
        """GET /orders — danh sách đơn (limit tối đa 100)."""
        params: dict = {"limit": min(max(limit, 1), 100)}
        if cursor:
            params["cursor"] = cursor
        return VDOrderList.model_validate(self._request("GET", "/orders", params=params))

    # ---- Mapper (driver tự dịch DTO -> nội bộ) ----------------------------

    def map_order_to_internal(self, order: VDOrder) -> dict:
        return mapper.order_to_internal(order)

    def map_catalog_product(self, product) -> dict:
        return mapper.catalog_product_to_internal(product)

    def map_balance(self, balance: VDBalance) -> dict:
        return {
            "currency": balance.currency,
            "balance": str(balance.balance),
            "livemode": balance.livemode,
        }

    def map_reward_voucher(self, voucher) -> dict:
        return mapper.reward_voucher_to_internal(voucher)

    # ---- Webhook ----------------------------------------------------------

    def webhook_signature_header(self) -> str:
        return "VD-Signature"

    def webhook_event_id_header(self) -> str:
        return "VD-Event-Id"

    def verify_webhook(self, *, raw_body, signature_header: str, secret: str, now_ts: int) -> bool:
        return verify_signature(
            raw_body=raw_body,
            signature_header=signature_header,
            secret=secret,
            now_ts=now_ts,
        )

    def parse_webhook(self, raw_body):
        return parse_event(raw_body)
