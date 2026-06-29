"""Lỗi chung cho lớp tích hợp nhà cung cấp (driver-agnostic).

`ProviderError` là lớp cơ sở mọi driver dùng chung: giữ code/detail/http_status/
request_id để log & đối soát, và map sang `AppException` nội bộ. Mỗi driver có thể
kế thừa để override bảng thông điệp lỗi riêng (vd `VDStoreError`, `CazyError`).
"""
from __future__ import annotations

from app.core.exceptions import AppException


class ProviderError(Exception):
    """Lỗi khi gọi API nhà cung cấp. Giữ nguyên thông tin gốc để log/đối soát."""

    def __init__(
        self,
        code: str,
        detail: str,
        *,
        http_status: int | None = None,
        request_id: str | None = None,
    ):
        self.code = code
        self.detail = detail
        self.http_status = http_status
        self.request_id = request_id
        super().__init__(f"{code}: {detail}")

    @classmethod
    def from_problem(cls, payload: dict, http_status: int) -> ProviderError:
        """Dựng lỗi từ body lỗi của nhà cung cấp.

        Mặc định đọc theo chuẩn problem+json (`code`/`detail`/`title`/`requestId`).
        Driver có shape lỗi khác thì override hàm này.
        """
        return cls(
            code=payload.get("code") or "request_failed",
            detail=payload.get("detail") or payload.get("title") or "Lỗi không xác định.",
            http_status=http_status,
            request_id=payload.get("requestId"),
        )

    def to_app_exception(self) -> AppException:
        """Chuyển sang AppException nội bộ (thông điệp tiếng Việt cho người dùng)."""
        return AppException("Nhà cung cấp trả về lỗi, vui lòng thử lại sau.", 502)


class UnknownDriverError(ProviderError):
    """Driver chưa được đăng ký trong registry (vd supplier driver='manual')."""

    def __init__(self, driver: str):
        self.driver = driver
        super().__init__(
            "unknown_driver",
            f"Driver '{driver}' chưa được hỗ trợ.",
            http_status=400,
        )

    def to_app_exception(self) -> AppException:
        return AppException(self.detail, 400)
