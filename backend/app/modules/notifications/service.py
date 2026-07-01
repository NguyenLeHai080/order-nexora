"""Service notifications — báo admin (Telegram) + báo khách (email).

Nguyên tắc: KHÔNG bao giờ làm hỏng luồng đơn hàng. Thiếu cấu hình => no-op;
lỗi mạng/SMTP => log rồi nuốt. Người gọi vẫn nên bọc try/except cho chắc.

Telegram: gọi Bot API sendMessage bằng httpx (đã là dependency).
Email: dùng smtplib + email.mime (thư viện chuẩn, không thêm dependency).
"""
from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import quote

import httpx
from sqlalchemy.orm import Session

from app.modules.settings import service as settings_service

logger = logging.getLogger(__name__)


def notify_admin(db: Session, text: str) -> bool:
    """Gửi tin nhắn Telegram cho admin. Trả True nếu đã gửi, False nếu skip/lỗi."""
    token = settings_service.get_value(db, settings_service.TELEGRAM_BOT_TOKEN_KEY)
    chat_id = settings_service.get_value(db, settings_service.TELEGRAM_CHAT_ID_KEY)
    if not token or not chat_id:
        return False
    try:
        resp = httpx.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            timeout=10.0,
        )
        resp.raise_for_status()
        return True
    except Exception as exc:  # noqa: BLE001 — thông báo lỗi không được phá luồng đơn
        logger.warning("notify_admin (telegram) that bai: %s", exc)
        return False


def send_customer_email(db: Session, to: str | None, subject: str, html: str) -> bool:
    """Gửi email kết quả cho khách. Trả True nếu đã gửi, False nếu skip/lỗi."""
    if not to:
        return False
    host = settings_service.get_value(db, settings_service.SMTP_HOST_KEY)
    if not host:
        return False
    port = int(settings_service.get_value(db, settings_service.SMTP_PORT_KEY, "587") or "587")
    user = settings_service.get_value(db, settings_service.SMTP_USER_KEY)
    password = settings_service.get_value(db, settings_service.SMTP_PASSWORD_KEY)
    sender = settings_service.get_value(db, settings_service.SMTP_FROM_KEY) or user or "no-reply@localhost"
    use_tls = settings_service.get_bool(db, settings_service.SMTP_USE_TLS_KEY, True)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            if use_tls:
                server.starttls()
            if user and password:
                server.login(user, password)
            server.sendmail(sender, [to], msg.as_string())
        return True
    except Exception as exc:  # noqa: BLE001 — email lỗi không được phá luồng đơn
        logger.warning("send_customer_email that bai: %s", exc)
        return False


def order_lookup_url(db: Session, order) -> str:  # noqa: ANN001
    """Link tra cứu đơn không cần đăng nhập (kèm token bí mật)."""
    base = (settings_service.get_value(db, settings_service.SITE_BASE_URL_KEY) or "").rstrip("/")
    token = quote(order.lookup_token or "")
    code = quote(order.code or "")
    return f"{base}/tra-cuu-don?code={code}&token={token}"


def build_admin_order_message(db: Session, orders: list) -> str:  # noqa: ANN001
    """Tin nhắn Telegram báo admin có đơn khách vãng lai đã thanh toán."""
    if not orders:
        return "Có đơn hàng mới cần xử lý."
    first = orders[0]
    total = sum((o.total_amount or 0) for o in orders)
    lines = [
        "<b>🔔 ĐƠN KHÁCH VÃNG LAI ĐÃ THANH TOÁN — cần xử lý gấp</b>",
        f"Mã: <b>{first.payment_reference or first.code}</b>",
        f"Khách: {first.guest_name or 'N/A'}",
    ]
    if first.guest_phone:
        lines.append(f"SĐT: {first.guest_phone}")
    if first.guest_email:
        lines.append(f"Email: {first.guest_email}")
    lines.append("")
    for o in orders:
        lines.append(f"• {o.product_name} × {o.quantity} — {o.total_amount}")
    lines.append("")
    lines.append(f"<b>Tổng: {total}</b>")
    return "\n".join(lines)


def build_customer_result_message(db: Session, order) -> tuple[str, str]:  # noqa: ANN001
    """(subject, html) báo kết quả xử lý đơn cho khách."""
    url = order_lookup_url(db, order)
    if order.status == "success":
        subject = f"Đơn {order.code} đã hoàn tất"
        body = (
            f"<p>Xin chào {order.guest_name or 'quý khách'},</p>"
            f"<p>Đơn hàng <b>{order.code}</b> ({order.product_name}) đã được xử lý thành công.</p>"
        )
        if order.delivered_content:
            body += f"<p>Thông tin bàn giao:</p><pre>{order.delivered_content}</pre>"
    elif order.status == "failed":
        subject = f"Đơn {order.code} xử lý không thành công"
        body = (
            f"<p>Xin chào {order.guest_name or 'quý khách'},</p>"
            f"<p>Rất tiếc, đơn hàng <b>{order.code}</b> ({order.product_name}) xử lý "
            f"không thành công. {order.note or ''}</p>"
            f"<p>Vui lòng liên hệ để được hỗ trợ hoàn tiền.</p>"
        )
    else:
        subject = f"Cập nhật đơn {order.code}"
        body = (
            f"<p>Xin chào {order.guest_name or 'quý khách'},</p>"
            f"<p>Đơn hàng <b>{order.code}</b> đang được xử lý.</p>"
        )
    body += f'<p>Tra cứu đơn: <a href="{url}">{url}</a></p>'
    return subject, body
