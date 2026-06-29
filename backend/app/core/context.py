"""Ngữ cảnh request: user hiện tại + organization đang làm việc.

Được nạp bởi dependency, truyền xuống service để scope dữ liệu theo tổ chức.
"""
from dataclasses import dataclass, field


@dataclass
class RequestContext:
    user_id: int
    organization_id: int | None = None
    roles: list[str] = field(default_factory=list)
    permissions: list[str] = field(default_factory=list)

    def has_permission(self, permission: str) -> bool:
        # Admin (toàn quyền) bỏ qua mọi kiểm tra.
        if "admin" in self.roles:
            return True
        return permission in self.permissions
