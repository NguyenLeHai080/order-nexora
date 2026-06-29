# Auth API

Endpoint xác thực và phiên làm việc. Các route bên dưới dùng tiền tố `/api`.

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| POST | `/auth/login` | Đăng nhập, cấp JWT | công khai |
| POST | `/auth/logout` | Đăng xuất | đăng nhập |
| POST | `/auth/forgot-password` | Quên mật khẩu | công khai |
| POST | `/auth/reset-password` | Đặt lại mật khẩu | công khai |
| POST | `/auth/switch-organization` | Chuyển tổ chức làm việc | đăng nhập |
| GET | `/user` | Thông tin user đăng nhập + roles/permissions | đăng nhập |

Ghi chú:

- Client gửi token qua `Authorization: Bearer <token>`.
- Các API cần dữ liệu theo tổ chức gửi thêm `X-Organization-Id`.
- Sau login, frontend dùng roles/permissions để dựng menu và chặn thao tác không đủ quyền.
