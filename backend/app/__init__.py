"""Order Nexora — backend FastAPI.

Gói `app` chứa toàn bộ mã nguồn ứng dụng, tổ chức theo kiến trúc phân lớp:

- `core/`       hạ tầng dùng chung (config, database, response, bảo mật, phân trang...).
- `middleware/` middleware xuyên suốt request (ghi log hoạt động, chế độ bảo trì).
- `modules/`    các module nghiệp vụ, mỗi module tự chứa router/service/repository/schema/model.
- `api.py`      điểm tập hợp & đăng ký toàn bộ router vào ứng dụng.
- `main.py`     khởi tạo ứng dụng FastAPI (middleware, exception handler, static files).

Xem thêm tài liệu kiến trúc tại docs/architecture.md.
"""
