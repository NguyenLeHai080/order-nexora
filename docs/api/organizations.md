# Organizations API

Endpoint quản lý tổ chức và cây tổ chức. Các route bên dưới dùng tiền tố `/api`.

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/organizations` | Danh sách tổ chức | `organizations.index` |
| GET | `/organizations/tree` | Cây tổ chức | `organizations.index` |
| GET | `/organizations/stats` | Thống kê | `organizations.index` |
| GET | `/organizations/public` | Danh sách công khai | công khai |
| GET | `/organizations/public-options` | Dropdown công khai | công khai |
| GET | `/organizations/{id}` | Chi tiết tổ chức | `organizations.show` |
| POST | `/organizations` | Tạo tổ chức | `organizations.store` |
| PUT | `/organizations/{id}` | Cập nhật tổ chức | `organizations.update` |
| DELETE | `/organizations/{id}` | Xóa tổ chức | `organizations.destroy` |
| POST | `/organizations/bulk-delete` | Xóa hàng loạt | `organizations.destroy` |
| PATCH | `/organizations/bulk-status` | Đổi trạng thái hàng loạt | `organizations.update` |

Ghi chú:

- Dữ liệu nghiệp vụ thường được scope theo `X-Organization-Id`.
- API public dùng cho màn chọn tổ chức hoặc form không cần đăng nhập.
