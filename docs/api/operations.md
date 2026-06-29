# Operations API

Endpoint vận hành hệ thống: cấu hình, nhật ký, upload và health check. Các route bên dưới dùng tiền tố `/api`.

## Settings

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/settings` | Danh sách cấu hình | `settings.index` |
| PUT | `/settings` | Tạo/cập nhật cấu hình | `settings.update` |
| GET | `/settings/maintenance` | Trạng thái bảo trì | `settings.index` |
| POST | `/settings/maintenance` | Bật/tắt bảo trì | `settings.update` |

## Log Activities

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/log-activities` | Danh sách nhật ký | `log-activities.index` |
| GET | `/log-activities/stats` | Thống kê nhật ký | `log-activities.index` |
| GET | `/log-activities/{id}` | Chi tiết nhật ký | `log-activities.show` |
| DELETE | `/log-activities/{id}` | Xóa một bản ghi | `log-activities.destroy` |
| POST | `/log-activities/bulk-delete` | Xóa hàng loạt | `log-activities.destroy` |
| POST | `/log-activities/delete-by-date` | Xóa theo khoảng thời gian | `log-activities.destroy` |
| POST | `/log-activities/clear` | Xóa toàn bộ | `log-activities.destroy` |

## Uploads & Health

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| POST | `/uploads` | Tải ảnh lên, tối đa 5MB, trả URL | đăng nhập |
| GET | `/health` | Health check | công khai |

Ghi chú:

- Upload chỉ nhận ảnh hợp lệ: JPG, PNG, WEBP, GIF.
- Health check dùng cho giám sát hoặc script kiểm tra backend sống.
