# Payments API

Endpoint ngân hàng nhận tiền, yêu cầu nạp và webhook thanh toán. Các route bên dưới dùng tiền tố `/api`.

## Banks

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/payments/banks` | Danh sách ngân hàng nhận tiền | `payments.index` |
| POST | `/payments/banks` | Thêm ngân hàng, kèm ảnh QR | `payments.store` |
| PUT | `/payments/banks/{id}` | Cập nhật ngân hàng | `payments.update` |
| DELETE | `/payments/banks/{id}` | Xóa ngân hàng | `payments.destroy` |

## Deposits

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/payments/deposits` | Lịch sử nạp tiền | `payments.index` |
| POST | `/payments/deposits` | Tạo yêu cầu nạp, sinh QR | đăng nhập |
| POST | `/payments/deposits/{id}/confirm` | Admin xác nhận nạp thủ công | `payments.update` |
| POST | `/payments/webhook` | Webhook báo có từ ngân hàng | công khai, xác thực chữ ký |

Ghi chú:

- Webhook phải xác thực chữ ký/HMAC trước khi cộng ví.
- Nội dung chuyển khoản nên có mã định danh duy nhất để đối soát.
- Admin có thể xác nhận thủ công khi webhook không về hoặc cần xử lý ngoại lệ.
