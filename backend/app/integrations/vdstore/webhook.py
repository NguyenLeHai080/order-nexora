"""Xác minh chữ ký webhook VD Store + parse event.

VD ký chuỗi `timestamp.rawBody` bằng HMAC-SHA256, header:
    VD-Signature: t=<ts>,v1=<hex>
Tolerance mặc định 300s (mục 12-13 tài liệu). rawBody là body JSON nguyên bản.

Hàm verify nhận `now_ts` từ ngoài (service truyền vào) để tránh phụ thuộc đồng hồ
ở tầng adapter và dễ test.
"""
from __future__ import annotations

import hashlib
import hmac

from app.integrations.vdstore.schemas import VDWebhookEvent

_DEFAULT_TOLERANCE = 300  # giây


def _parse_signature(header: str) -> tuple[int | None, str | None]:
    """Tách `t=<ts>,v1=<hex>` -> (timestamp, hex)."""
    t: int | None = None
    v1: str | None = None
    for part in header.split(","):
        key, _, value = part.strip().partition("=")
        if key == "t" and value.isdigit():
            t = int(value)
        elif key == "v1" and value:
            v1 = value
    return t, v1


def verify_signature(
    *,
    raw_body: bytes | str,
    signature_header: str,
    secret: str,
    now_ts: int,
    tolerance: int = _DEFAULT_TOLERANCE,
) -> bool:
    """True nếu chữ ký hợp lệ và timestamp trong khoảng dung sai."""
    if not signature_header or not secret:
        return False

    t, v1 = _parse_signature(signature_header)
    if t is None or not v1:
        return False
    if abs(now_ts - t) > tolerance:
        return False

    body = raw_body if isinstance(raw_body, str) else raw_body.decode("utf-8")
    expected = hmac.new(
        secret.encode("utf-8"),
        f"{t}.{body}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, v1)


def parse_event(raw_body: bytes | str) -> VDWebhookEvent:
    """Parse body webhook (đã verify) thành VDWebhookEvent."""
    body = raw_body if isinstance(raw_body, str) else raw_body.decode("utf-8")
    return VDWebhookEvent.model_validate_json(body)
