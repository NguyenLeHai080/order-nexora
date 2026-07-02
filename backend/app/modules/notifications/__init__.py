"""Module notifications — báo admin (Telegram) + báo khách (email).

Chỉ có service (không router). Mọi hàm đều "best-effort": thiếu cấu hình =>
no-op; lỗi mạng => nuốt lỗi (không làm hỏng luồng đơn hàng). Xem service.py.
"""
