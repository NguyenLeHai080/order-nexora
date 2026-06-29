"""Dịch DTO của VD Store sang model/giá trị nội bộ (anti-corruption layer).

Đây là nơi DUY NHẤT biết cả hai shape. Nghiệp vụ chỉ nhận kết quả đã dịch.
"""
from __future__ import annotations

from decimal import Decimal

from app.integrations.vdstore.schemas import (
    VDCatalogProduct,
    VDOrder,
    VDRewardVoucher,
)

# VD status (đơn) -> status nội bộ Order (processing|success|failed).
# PARTIALLY_* vẫn còn việc chờ hoặc đã hoàn một phần -> coi là processing để
# người vận hành theo dõi tiếp; CANCELLED -> failed (đã/được hoàn tiền).
_ORDER_STATUS_MAP: dict[str, str] = {
    "FULFILLED": "success",
    "PENDING_FULFILLMENT": "processing",
    "PARTIALLY_FULFILLED": "processing",
    "PARTIALLY_CANCELLED": "processing",
    "CANCELLED": "failed",
}


def map_order_status(vd_status: str) -> str:
    """Đổi trạng thái đơn VD sang trạng thái Order nội bộ."""
    return _ORDER_STATUS_MAP.get(vd_status, "processing")


def is_terminal_status(vd_status: str) -> bool:
    """True nếu đơn đã chốt (không còn item chờ giao)."""
    return vd_status in {"FULFILLED", "CANCELLED", "PARTIALLY_CANCELLED"}


def order_to_internal(order: VDOrder) -> dict:
    """Rút các trường VD cần cho Order nội bộ (không tạo object Order trực tiếp).

    Trả dict để service tự quyết cập nhật field nào, tránh ghi đè ngoài ý muốn.
    """
    return {
        "status": map_order_status(order.status),
        "delivered_content": order.first_delivery_content,
        "provider_status": order.status,
        "refunded_amount": _to_decimal(order.refunded_amount),
        "total_amount": _to_decimal(order.total_amount),
    }


def catalog_product_to_internal(product: VDCatalogProduct) -> dict:
    """Map sản phẩm catalog VD sang field Product nội bộ.

    base_price = giá CTV (giá nhập của ta). markup do ta tự đặt, không lấy từ VD.
    stock_status suy từ available/availableQuantity. Các trường tham khảo khác
    (name_en, regular_price, discount %, delivery_type, số lượng NCC) lấy đầy đủ.
    """
    available = product.available and (
        product.available_quantity is None or product.available_quantity > 0
    )
    return {
        "external_id": product.id,
        "name": product.name,
        "name_en": product.name_en,
        "description": product.description,
        "base_price": _to_decimal(product.price) or Decimal("0.00"),
        "regular_price": _to_decimal(product.regular_price),
        "provider_discount_percent": _to_decimal(product.collaborator_discount_percent),
        "stock_status": "in_stock" if available else "out_of_stock",
        "delivery_type": product.delivery_type,
        "provider_quantity": product.available_quantity,
    }


def reward_voucher_to_internal(voucher: VDRewardVoucher) -> dict:
    """Map voucher thưởng (webhook order.updated) sang field Voucher nội bộ."""
    is_percent = bool(voucher.discount_percent)
    return {
        "code": voucher.code,
        "description": "Voucher thưởng từ nhà cung cấp VD Store.",
        "discount_type": "percent" if is_percent else "amount",
        "discount_value": (
            Decimal(str(voucher.discount_percent))
            if is_percent
            else _to_decimal(voucher.amount) or Decimal("0.00")
        ),
        "max_discount": _to_decimal(voucher.max_discount_amount) or Decimal("0.00"),
        "usage_limit": voucher.max_uses or 1,
        "ends_at_raw": voucher.expires_at,  # service tự parse ISO -> datetime
    }


def _to_decimal(value: int | float | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))
