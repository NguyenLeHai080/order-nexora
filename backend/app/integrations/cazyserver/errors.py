"""Lỗi adapter Cazyserver.

Cazy (reseller domain API) chưa có tài liệu shape lỗi chính thức trong repo này.
Tạm thời đọc linh hoạt các khóa thường gặp (`code`/`error`/`message`) và map về
thông điệp tiếng Việt mặc định. Khi có response thật, bổ sung bảng `_CODE_MESSAGES`.
"""
from __future__ import annotations

from app.core.exceptions import AppException
from app.integrations.errors import ProviderError

_CODE_MESSAGES: dict[str, tuple[int, str]] = {
    "missing_credentials": (502, "Cấu hình nhà cung cấp thiếu API key/secret."),
    "invalid_credentials": (502, "API key/secret nhà cung cấp sai hoặc đã thu hồi."),
    "insufficient_funds": (402, "Số dư tài khoản nhà cung cấp không đủ."),
    "domain_unavailable": (409, "Tên miền không khả dụng để đăng ký."),
}


class CazyError(ProviderError):
    """Lỗi khi gọi Cazyserver. Shape lỗi đọc linh hoạt."""

    @classmethod
    def from_problem(cls, payload: dict, http_status: int) -> CazyError:
        """Cazy có thể trả `{error: ...}` hoặc `{message: ...}` thay vì problem+json."""
        code = payload.get("code") or payload.get("error") or "request_failed"
        detail = (
            payload.get("detail")
            or payload.get("message")
            or (payload.get("error") if isinstance(payload.get("error"), str) else None)
            or "Lỗi không xác định."
        )
        return cls(code=str(code), detail=str(detail), http_status=http_status)

    def to_app_exception(self) -> AppException:
        status_code, message = _CODE_MESSAGES.get(
            self.code, (502, "Nhà cung cấp trả về lỗi, vui lòng thử lại sau.")
        )
        return AppException(message, status_code)
