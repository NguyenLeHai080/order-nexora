"""DTO khớp JSON của VD Store Partner API.

CHỈ dùng trong lớp adapter `app.integrations.vdstore`. Nghiệp vụ không import
trực tiếp các schema này — mapper.py sẽ dịch sang model nội bộ.

Tham chiếu: docs/huong-dan-tich-hop-api-ctv.md (mục 4, 5, 6, 8, 9, 12).
Các field dùng alias camelCase theo đúng VD; bật populate_by_name để dễ dựng.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class _VDModel(BaseModel):
    # VD trả camelCase; cho phép field nội bộ snake_case + alias, bỏ qua field thừa.
    model_config = ConfigDict(populate_by_name=True, extra="ignore")


# ---- Catalog (GET /catalog) ----------------------------------------------


class VDCatalogProduct(_VDModel):
    id: str
    name: str
    name_en: str | None = Field(default=None, alias="nameEn")
    description: str | None = None
    price: int  # giá CTV (VND, số nguyên)
    regular_price: int | None = Field(default=None, alias="regularPrice")
    collaborator_discount_percent: float | None = Field(
        default=None, alias="collaboratorDiscountPercent"
    )
    delivery_type: str = Field(alias="deliveryType")  # STOCK_ITEM|SHARED_CONTENT|MANUAL
    available: bool = True
    available_quantity: int | None = Field(default=None, alias="availableQuantity")


class VDCatalogCategory(_VDModel):
    id: str
    name: str
    products: list[VDCatalogProduct] = Field(default_factory=list)


class VDCatalog(_VDModel):
    livemode: bool = False
    categories: list[VDCatalogCategory] = Field(default_factory=list)
    uncategorized: list[VDCatalogProduct] = Field(default_factory=list)


# ---- Balance (GET /balance) ----------------------------------------------


class VDBalance(_VDModel):
    livemode: bool = False
    currency: str = "VND"
    balance: int


# ---- Orders (POST /orders, GET /orders/:id, webhook) ---------------------


class VDOrderDelivery(_VDModel):
    content: str | None = None


class VDOrderItem(_VDModel):
    id: str | None = None
    product_id: str = Field(alias="productId")
    product_name: str | None = Field(default=None, alias="productName")
    delivery_type: str | None = Field(default=None, alias="deliveryType")
    quantity: int = 1
    unit_price: int | None = Field(default=None, alias="unitPrice")
    subtotal_amount: int | None = Field(default=None, alias="subtotalAmount")
    collaborator_discount_amount: int | None = Field(
        default=None, alias="collaboratorDiscountAmount"
    )
    voucher_discount_amount: int | None = Field(default=None, alias="voucherDiscountAmount")
    total_amount: int | None = Field(default=None, alias="totalAmount")
    status: str | None = None  # FULFILLED|PENDING_FULFILLMENT|CANCELLED
    delivery: VDOrderDelivery | None = None


class VDOrder(_VDModel):
    id: str
    livemode: bool = False
    external_order_id: str | None = Field(default=None, alias="externalOrderId")
    status: str  # FULFILLED|PENDING_FULFILLMENT|PARTIALLY_*|CANCELLED
    currency: str = "VND"
    subtotal_amount: int | None = Field(default=None, alias="subtotalAmount")
    collaborator_discount_amount: int | None = Field(
        default=None, alias="collaboratorDiscountAmount"
    )
    voucher_discount_amount: int | None = Field(default=None, alias="voucherDiscountAmount")
    total_amount: int | None = Field(default=None, alias="totalAmount")
    refunded_amount: int | None = Field(default=None, alias="refundedAmount")
    voucher_code: str | None = Field(default=None, alias="voucherCode")
    balance_after: int | None = Field(default=None, alias="balanceAfter")
    items: list[VDOrderItem] = Field(default_factory=list)
    created_at: str | None = Field(default=None, alias="createdAt")
    updated_at: str | None = Field(default=None, alias="updatedAt")

    @property
    def first_delivery_content(self) -> str | None:
        """Gộp nội dung giao của các item đã FULFILLED (nếu có)."""
        contents = [
            it.delivery.content
            for it in self.items
            if it.delivery and it.delivery.content
        ]
        return "\n".join(contents) if contents else None


class VDOrderList(_VDModel):
    data: list[VDOrder] = Field(default_factory=list)
    has_more: bool = Field(default=False, alias="hasMore")
    next_cursor: str | None = Field(default=None, alias="nextCursor")


# ---- Webhook (mục 12) ------------------------------------------------------


class VDRewardVoucher(_VDModel):
    code: str
    amount: int | None = None
    discount_percent: float | None = Field(default=None, alias="discountPercent")
    max_discount_amount: int | None = Field(default=None, alias="maxDiscountAmount")
    max_uses: int | None = Field(default=None, alias="maxUses")
    allow_collaborator_stacking: bool | None = Field(
        default=None, alias="allowCollaboratorStacking"
    )
    expires_at: str | None = Field(default=None, alias="expiresAt")


class VDWebhookData(_VDModel):
    order: VDOrder | None = None
    reward_voucher: VDRewardVoucher | None = Field(default=None, alias="rewardVoucher")


class VDWebhookEvent(_VDModel):
    id: str
    type: str  # order.created|order.updated|webhook.test
    created_at: str | None = Field(default=None, alias="createdAt")
    livemode: bool = False
    data: VDWebhookData | None = None
