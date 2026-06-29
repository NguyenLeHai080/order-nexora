# Users, Roles & Permissions API

Endpoint quản lý người dùng, vai trò và quyền. Các route bên dưới dùng tiền tố `/api`.

## Users

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/users` | Danh sách người dùng | `users.index` |
| GET | `/users/stats` | Thống kê người dùng | `users.index` |
| GET | `/users/{id}` | Chi tiết người dùng | `users.show` |
| POST | `/users` | Tạo người dùng, kèm `role_ids` | `users.store` |
| PUT | `/users/{id}` | Cập nhật người dùng, kèm `role_ids` | `users.update` |
| DELETE | `/users/{id}` | Xóa người dùng | `users.destroy` |
| POST | `/users/bulk-delete` | Xóa hàng loạt | `users.destroy` |
| PATCH | `/users/bulk-status` | Đổi trạng thái hàng loạt | `users.update` |
| POST | `/users/{id}/balance` | Cộng/trừ số dư ví | `users.update` |

## Roles & Permissions

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/permissions` | Danh sách toàn bộ quyền | `permissions.index` |
| GET | `/roles` | Danh sách vai trò | `roles.index` |
| GET | `/roles/{id}` | Chi tiết vai trò | `roles.show` |
| POST | `/roles` | Tạo vai trò, kèm `permission_ids` | `roles.store` |
| PUT | `/roles/{id}` | Cập nhật vai trò | `roles.update` |
| DELETE | `/roles/{id}` | Xóa vai trò | `roles.destroy` |

Ghi chú:

- Permission đặt theo dạng `subject.action`.
- Role được phân giải theo tổ chức hiện hành.
- `admin` bỏ qua kiểm tra quyền ở backend.
