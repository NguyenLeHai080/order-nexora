# Orders API

Endpoint mua hàng, lịch sử đơn và thống kê chi tiêu. Các route bên dưới dùng tiền tố `/api`.

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/orders` | Lịch sử đơn hàng toàn hệ thống | `orders.index` |
| GET | `/orders/me` | Đơn hàng của tôi | đăng nhập |
| GET | `/orders/leaderboard` | Bảng xếp hạng chi tiêu | `orders.index` |
| GET | `/orders/{id}` | Chi tiết đơn | `orders.show` |
| POST | `/orders` | Mua sản phẩm, trừ kho và ví | đăng nhập |

Luồng tạo đơn chính:

1. Kiểm tra user, tổ chức và số dư ví.
2. Kiểm tra sản phẩm, tồn kho và voucher nếu có.
3. Gọi supplier/integration khi sản phẩm cần lấy hàng real-time.
4. Trừ ví, ghi đơn, trả nội dung hàng cho khách.

Ghi chú:

- Nên dùng idempotency key khi client có cơ chế retry.
- Lỗi nghiệp vụ như thiếu số dư hoặc hết hàng trả về envelope lỗi theo [conventions.md](conventions.md).
