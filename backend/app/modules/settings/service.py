"""Service cho Setting — đọc/ghi cấu hình, tiện ích maintenance mode."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.settings.models import Setting

MAINTENANCE_KEY = "maintenance_mode"


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
