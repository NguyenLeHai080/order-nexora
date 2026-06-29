"""Module Partner — cầu nối giữa đơn nội bộ và đơn của nhà cung cấp (VD Store...).

Giữ Order/Product sạch, không nhét field của riêng một provider vào. Module này
lưu mapping đơn nội bộ ↔ đơn provider và log webhook để chống xử lý trùng.
Thiết kế đa-provider qua trường `driver`.
"""
