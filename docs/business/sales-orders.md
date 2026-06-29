# Bán Hàng & Đơn Hàng

Phân hệ này xử lý sản phẩm, mua hàng, lịch sử đơn và thống kê chi tiêu.

## Phạm vi

- Danh sách sản phẩm và giá bán.
- Luồng mua sản phẩm số.
- Lịch sử đơn hàng của admin và khách hàng.
- Leaderboard chi tiêu theo khoảng thời gian.
- Áp dụng voucher trong luồng mua.

## Luồng mua hàng

1. Khách chọn sản phẩm và số lượng.
2. Backend kiểm tra đăng nhập, tổ chức hiện hành và số dư ví.
3. Backend kiểm tra trạng thái sản phẩm, tồn kho và voucher.
4. Nếu sản phẩm lấy từ nhà cung cấp, backend gọi integration tương ứng.
5. Backend tạo đơn, trừ ví và trả hàng cho khách.
6. Hệ thống ghi log để phục vụ đối soát.

## Trạng thái cần theo dõi

| Đối tượng | Trạng thái thường gặp |
|-----------|-----------------------|
| Đơn hàng | `pending`, `success`, `failed` |
| Item/hàng | còn hàng, hết hàng, lỗi nhà cung cấp |
| Voucher | còn hiệu lực, hết hạn, hết lượt dùng |

API liên quan: [../api/catalog.md](../api/catalog.md), [../api/orders.md](../api/orders.md).
