"""Lỗi adapter VD Store + map mã lỗi problem+json sang exception nội bộ.

VD trả lỗi dạng application/problem+json với trường `code` (xem mục 17 tài liệu).
Ta gói lại thành VDStoreError (kế thừa ProviderError) giữ nguyên code/detail/
requestId để log & đối soát, đồng thời map sang AppException nội bộ với thông điệp
tiếng Việt thân thiện theo bảng `_CODE_MESSAGES`.
"""
from __future__ import annotations

from app.core.exceptions import AppException
from app.integrations.errors import ProviderError

# Map code lỗi VD -> (HTTP nội bộ, thông điệp người dùng).
# Code không có trong bảng sẽ dùng thông điệp mặc định.
_CODE_MESSAGES: dict[str, tuple[int, str]] = {
    "missing_api_key": (502, "Cấu hình nhà cung cấp thiếu API key."),
    "invalid_api_key": (502, "API key nhà cung cấp sai hoặc đã bị thu hồi."),
    "partner_account_disabled": (502, "Tài khoản CTV phía nhà cung cấp đang bị khóa."),
    "insufficient_scope": (502, "API key nhà cung cấp thiếu quyền cần thiết."),
    "browser_requests_forbidden": (500, "Gọi API nhà cung cấp sai cách (từ trình duyệt)."),
    "invalid_idempotency_key": (500, "Khóa idempotency không hợp lệ."),
    "invalid_external_order_id": (500, "Mã đơn nội bộ không hợp lệ."),
    "invalid_items": (400, "Giỏ hàng rỗng hoặc vượt quá 20 sản phẩm."),
    "duplicate_external_order": (409, "Đơn này đã được gửi sang nhà cung cấp trước đó."),
    "idempotency_conflict": (409, "Trùng khóa idempotency nhưng nội dung đơn khác nhau."),
    "request_in_progress": (409, "Đơn đang được xử lý, vui lòng thử lại sau."),
    "insufficient_balance": (402, "Ví CTV không đủ tiền để tạo đơn."),
    "out_of_stock": (409, "Sản phẩm bên nhà cung cấp đã hết hàng."),
    "rate_limit_exceeded": (429, "Vượt giới hạn request tới nhà cung cấp."),
    "concurrency_limit_exceeded": (429, "Quá nhiều đơn gửi đồng thời tới nhà cung cấp."),
    "rate_limiter_unavailable": (503, "Dịch vụ nhà cung cấp tạm thời không sẵn sàng."),
    "partner_api_disabled": (503, "Partner API của nhà cung cấp đang tạm tắt."),
}


class VDStoreError(ProviderError):
    """Lỗi khi gọi VD Store. Dùng shape problem+json + bảng thông điệp riêng.

    Kế thừa `ProviderError` (đã có __init__ + from_problem chuẩn problem+json), chỉ
    override `to_app_exception` để dịch code VD sang thông điệp tiếng Việt.
    """

    def to_app_exception(self) -> AppException:
        """Chuyển sang AppException nội bộ (thông điệp tiếng Việt cho người dùng)."""
        status_code, message = _CODE_MESSAGES.get(
            self.code, (502, "Nhà cung cấp trả về lỗi, vui lòng thử lại sau.")
        )
        return AppException(message, status_code)
