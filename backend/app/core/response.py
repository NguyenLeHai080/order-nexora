"""Chuẩn response envelope dùng chung toàn hệ thống: {success, message, data}.

Mọi endpoint trả về thống nhất để frontend xử lý đồng nhất, bám theo
quy ước của dự án tham chiếu.
"""
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Envelope(BaseModel, Generic[T]):
    """Response chuẩn cho dữ liệu đơn lẻ hoặc thông báo."""

    success: bool = True
    message: str | None = None
    data: T | None = None


class PageMeta(BaseModel):
    current_page: int
    from_: int | None = None
    last_page: int
    per_page: int
    to: int | None = None
    total: int

    model_config = {"populate_by_name": True}

    def model_dump(self, **kwargs: Any) -> dict[str, Any]:  # type: ignore[override]
        d = super().model_dump(**kwargs)
        # Đổi from_ -> from cho khớp quy ước API tham chiếu
        if "from_" in d:
            d["from"] = d.pop("from_")
        return d


def success(data: Any = None, message: str | None = None) -> dict[str, Any]:
    """Tạo nhanh response thành công."""
    return {"success": True, "message": message, "data": data}


def paginated(items: list[Any], total: int, page: int, per_page: int) -> dict[str, Any]:
    """Response phân trang chuẩn: data + meta."""
    last_page = max(1, (total + per_page - 1) // per_page)
    count = len(items)
    return {
        "success": True,
        "data": items,
        "meta": {
            "current_page": page,
            "from": (page - 1) * per_page + 1 if count else None,
            "last_page": last_page,
            "per_page": per_page,
            "to": (page - 1) * per_page + count if count else None,
            "total": total,
        },
    }
