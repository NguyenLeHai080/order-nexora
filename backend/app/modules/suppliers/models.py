"""Model Supplier — nhà cung cấp bên thứ 3 và cấu hình API affiliate.

Supplier đóng vai trò "provider config": giữ thông tin đấu nối API của một nhà
cung cấp (vd VD Store Partner API). Mỗi supplier có thể chạy 2 môi trường
test/live với cặp API key + webhook secret riêng. Lớp adapter trong
`app.integrations.<driver>` đọc cấu hình này để gọi API — model nội bộ không
phụ thuộc shape JSON phía nhà cung cấp (anti-corruption layer).
"""
from __future__ import annotations

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import OrgScopedMixin, PKMixin, TimestampMixin


class Supplier(PKMixin, TimestampMixin, OrgScopedMixin, Base):
    __tablename__ = "suppliers"

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Driver adapter xử lý nhà cung cấp này. "manual" = không có API (nhập tay),
    # "vdstore" = VD Store Partner API. Thêm driver mới khi tích hợp NCC khác.
    driver: Mapped[str] = mapped_column(String(50), default="manual", index=True)

    # Base URL của Partner API (vd https://api.vanhdao.io.vn/partner/v1).
    api_endpoint: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Môi trường đang dùng để gọi đơn thật: "test" | "live".
    environment: Mapped[str] = mapped_column(String(10), default="test", index=True)

    # Cặp API key theo môi trường (vd_test_... / vd_live_...). Không bao giờ trả ra FE.
    api_key_test: Mapped[str | None] = mapped_column(Text, nullable=True)
    api_key_live: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Giữ tương thích ngược: api_key cũ coi như key mặc định/legacy.
    api_key: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Webhook secret theo môi trường (whsec_...), dùng verify chữ ký HMAC.
    webhook_secret_test: Mapped[str | None] = mapped_column(Text, nullable=True)
    webhook_secret_live: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Cấu hình tự do theo từng driver (vd Cazy cần api_key + api_secret). Mỗi driver
    # tự quyết khóa nào nằm đây — tránh phải thêm cột cứng cho mỗi nhà cung cấp mới.
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)

    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    def cfg(self, key: str, default=None):
        """Đọc một khóa trong cột JSON config (an toàn khi config=None)."""
        return (self.config or {}).get(key, default)

    @property
    def active_api_key(self) -> str | None:
        """API key tương ứng môi trường đang chọn (fallback về api_key legacy)."""
        if self.environment == "live":
            return self.api_key_live or self.api_key
        return self.api_key_test or self.api_key

    @property
    def active_webhook_secret(self) -> str | None:
        """Webhook secret tương ứng môi trường đang chọn."""
        return self.webhook_secret_live if self.environment == "live" else self.webhook_secret_test

    @property
    def expects_livemode(self) -> bool:
        """True nếu supplier đang chạy môi trường live (đơn phải có livemode=True)."""
        return self.environment == "live"
