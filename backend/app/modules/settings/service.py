"""Service cho Setting — đọc/ghi cấu hình, tiện ích maintenance mode."""
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.settings.models import Setting

MAINTENANCE_KEY = "maintenance_mode"
# % markup mặc định áp cho sản phẩm MỚI khi đồng bộ catalog NCC (để có giá bán ngay).
DEFAULT_MARKUP_KEY = "default_markup_percent"
OWNER_WALLET_USER_ID_KEY = "owner_wallet_user_id"
MANUAL_FULFILLMENT_ZALO_NAME_KEY = "manual_fulfillment_zalo_name"
MANUAL_FULFILLMENT_ZALO_URL_KEY = "manual_fulfillment_zalo_url"
MANUAL_FULFILLMENT_QR_URL_KEY = "manual_fulfillment_qr_url"
MANUAL_FULFILLMENT_INSTRUCTIONS_KEY = "manual_fulfillment_instructions"


def get_value(db: Session, key: str, default: str | None = None) -> str | None:
    setting = db.scalars(select(Setting).where(Setting.key == key)).first()
    return setting.value if setting else default


def set_value(db: Session, key: str, value: str, description: str | None = None) -> Setting:
    setting = db.scalars(select(Setting).where(Setting.key == key)).first()
    if setting is None:
        setting = Setting(key=key, value=value, description=description)
        db.add(setting)
    else:
        setting.value = value
        if description is not None:
            setting.description = description
    db.commit()
    db.refresh(setting)
    return setting


def is_maintenance() -> bool:
    """Đọc trạng thái bảo trì (tự mở session riêng để dùng trong middleware)."""
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        return get_value(db, MAINTENANCE_KEY, "0") == "1"
    except Exception:  # noqa: BLE001 — DB chưa sẵn sàng thì coi như không bảo trì
        return False
    finally:
        db.close()


def get_default_markup_percent(db: Session) -> Decimal:
    """% markup mặc định cho sản phẩm mới khi sync (0 nếu chưa cấu hình/không hợp lệ)."""
    raw = get_value(db, DEFAULT_MARKUP_KEY, "0")
    try:
        value = Decimal(raw or "0")
    except (InvalidOperation, ValueError):
        return Decimal("0")
    return value if value >= 0 else Decimal("0")


def get_manual_fulfillment_config(db: Session) -> dict[str, str | None]:
    """Thong tin Zalo/QR de khach lien he nhan vien xu ly don thu cong."""
    return {
        "name": get_value(db, MANUAL_FULFILLMENT_ZALO_NAME_KEY, "Nguyen Le Hai"),
        "zalo_url": get_value(db, MANUAL_FULFILLMENT_ZALO_URL_KEY, None),
        "qr_url": get_value(db, MANUAL_FULFILLMENT_QR_URL_KEY, None),
        "instructions": get_value(
            db,
            MANUAL_FULFILLMENT_INSTRUCTIONS_KEY,
            "Don nay can nhan vien xu ly thu cong. Vui long quet Zalo hoac lien he nhan vien de duoc giao hang.",
        ),
    }
