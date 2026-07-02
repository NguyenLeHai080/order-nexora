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
# Org có catalog hiển thị trên landing page công khai (API /public). Nếu chưa cấu
# hình, public router fallback về org đầu tiên có sản phẩm active.
PUBLIC_ORG_ID_KEY = "public_org_id"

# Guest checkout (mua không cần đăng nhập) + thông báo.
GUEST_CHECKOUT_ENABLED_KEY = "guest_checkout_enabled"
# Đơn NCC giao TỰ ĐỘNG (AUTO): bật => tự gọi NCC ngay sau khi khách trả tiền;
# tắt => chờ admin bấm duyệt.
GUEST_AUTO_FULFILL_KEY = "guest_auto_fulfill"
TELEGRAM_BOT_TOKEN_KEY = "telegram_bot_token"
TELEGRAM_CHAT_ID_KEY = "telegram_chat_id"
SMTP_HOST_KEY = "smtp_host"
SMTP_PORT_KEY = "smtp_port"
SMTP_USER_KEY = "smtp_user"
SMTP_PASSWORD_KEY = "smtp_password"
SMTP_FROM_KEY = "smtp_from"
SMTP_USE_TLS_KEY = "smtp_use_tls"
# URL gốc trang công khai — dùng dựng link tra cứu đơn gửi cho khách.
SITE_BASE_URL_KEY = "site_base_url"

# SMS cho khách (tùy chọn) — điểm cắm nhà cung cấp SMS/Zalo ZNS. Chưa cấu hình => no-op.
# provider: "" (tắt) | "esms" | "speedsms" | "generic_http". Xem notifications.send_customer_sms.
SMS_PROVIDER_KEY = "sms_provider"
SMS_API_KEY_KEY = "sms_api_key"
SMS_API_SECRET_KEY = "sms_api_secret"
SMS_BRANDNAME_KEY = "sms_brandname"
SMS_ENDPOINT_KEY = "sms_endpoint"  # cho generic_http: URL nhận {phone, message}

# Đồng bộ catalog tự động (scheduler nền). Tắt mặc định để không gọi NCC ngoài ý muốn.
CATALOG_SYNC_ENABLED_KEY = "catalog_sync_enabled"
# Chu kỳ chạy tự động (phút). 0/nhỏ hơn 5 => coi như tắt để tránh spam API NCC.
CATALOG_SYNC_INTERVAL_MINUTES_KEY = "catalog_sync_interval_minutes"
# Tự đánh dấu NGƯNG BÁN sản phẩm không còn trong catalog NCC (out_of_stock + inactive).
CATALOG_SYNC_DISCONTINUE_MISSING_KEY = "catalog_sync_discontinue_missing"
# Gửi Telegram tóm tắt khi sync tự động có thay đổi/cảnh báo/lỗi.
CATALOG_SYNC_NOTIFY_KEY = "catalog_sync_notify"



def get_value(db: Session, key: str, default: str | None = None) -> str | None:
    setting = db.scalars(select(Setting).where(Setting.key == key)).first()
    return setting.value if setting else default


def get_bool(db: Session, key: str, default: bool = False) -> bool:
    """Đọc setting boolean — chấp nhận '1'/'true'/'on'/'yes' (không phân biệt hoa thường)."""
    raw = get_value(db, key, None)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "on", "yes"}


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


def get_catalog_sync_config(db: Session) -> dict[str, bool | int]:
    """Cấu hình đồng bộ catalog tự động — tắt mặc định để tránh gọi NCC ngoài ý muốn."""
    raw_interval = get_value(db, CATALOG_SYNC_INTERVAL_MINUTES_KEY, "60")
    try:
        interval = int(raw_interval or "60")
    except (TypeError, ValueError):
        interval = 60
    return {
        "enabled": get_bool(db, CATALOG_SYNC_ENABLED_KEY, False),
        "interval_minutes": max(interval, 0),
        "discontinue_missing": get_bool(db, CATALOG_SYNC_DISCONTINUE_MISSING_KEY, True),
        "notify": get_bool(db, CATALOG_SYNC_NOTIFY_KEY, True),
    }


def get_manual_fulfillment_config(db: Session) -> dict[str, str | None]:
    """Thong tin Zalo/QR de khach lien he nhan vien xu ly don thu cong."""
    return {
        "name": get_value(db, MANUAL_FULFILLMENT_ZALO_NAME_KEY, "Nguyen Le Hai"),
        "zalo_url": get_value(db, MANUAL_FULFILLMENT_ZALO_URL_KEY, None),
        "qr_url": get_value(db, MANUAL_FULFILLMENT_QR_URL_KEY, None),
        "instructions": get_value(
            db,
            MANUAL_FULFILLMENT_INSTRUCTIONS_KEY,
            "Don nay can nhan vien xu ly thu cong. Vui long quet Zalo hoac "
            "lien he nhan vien de duoc giao hang.",
        ),
    }


def get_public_org_id(db: Session) -> int | None:
    """Org có catalog hiển thị trên landing công khai.

    Ưu tiên Setting `public_org_id`; nếu chưa cấu hình hoặc không hợp lệ, fallback
    về organization_id của sản phẩm active đầu tiên (org có catalog đã đồng bộ).
    Trả None nếu hệ thống chưa có sản phẩm nào — public API sẽ trả danh sách rỗng.
    """
    raw = get_value(db, PUBLIC_ORG_ID_KEY, None)
    if raw:
        try:
            return int(raw)
        except (TypeError, ValueError):
            pass

    # Fallback: org của sản phẩm active đầu tiên.
    from app.modules.products.models import Product

    return db.scalars(
        select(Product.organization_id)
        .where(Product.status == "active", Product.organization_id.isnot(None))
        .limit(1)
    ).first()
