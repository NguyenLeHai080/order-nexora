"""Hạ tầng dùng chung cho toàn ứng dụng (không phụ thuộc nghiệp vụ cụ thể).

- `config`     đọc cấu hình từ biến môi trường (pydantic-settings).
- `database`   khởi tạo SQLAlchemy engine/session + Base.
- `context`    RequestContext mang thông tin user + tổ chức hiện tại.
- `response`   chuẩn hóa envelope {success, message, data} + phân trang.
- `pagination` tham số list (search/sort/limit/page) dùng lại cho mọi module.
- `repository` lớp Repository gốc cho thao tác CRUD lặp lại.
- `security`   băm/đối chiếu mật khẩu, tạo & giải mã JWT.
- `abilities`  chuyển "subject.action" thành abilities cho CASL phía frontend.
- `exceptions` exception nghiệp vụ + handler trả envelope lỗi thống nhất.
- `models`     mixin/cột dùng chung (id, timestamps).
"""
