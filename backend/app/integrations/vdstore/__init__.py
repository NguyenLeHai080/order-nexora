"""Adapter VD Store Partner API.

Base URL ví dụ: https://api.vanhdao.io.vn/partner/v1
Tài liệu nguồn: docs/huong-dan-tich-hop-api-ctv.md

Export ra ngoài đúng những gì nghiệp vụ cần — không lộ DTO nội bộ của VD.
Nghiệp vụ chỉ dùng: VDStoreClient (gọi API), VDStoreError (lỗi),
verify_signature/parse_event (webhook) và các hàm mapper.* để dịch sang model.
"""
from app.integrations.registry import register
from app.integrations.vdstore.client import VDStoreClient
from app.integrations.vdstore.errors import VDStoreError
from app.integrations.vdstore.webhook import parse_event, verify_signature

# Đăng ký driver vào registry khi package được import.
register(VDStoreClient)

__all__ = [
    "VDStoreClient",
    "VDStoreError",
    "verify_signature",
    "parse_event",
]
