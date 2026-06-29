# Tổng Quan Nghiệp Vụ

Order Nexora là hệ thống bán sản phẩm số kết hợp mô hình đại lý/CTV. Hệ thống quản lý sản phẩm, đơn hàng, ví người dùng, tích hợp nhà cung cấp và cổng thanh toán tự động.

## Luồng vận hành cơ bản

1. Admin cấu hình nhà cung cấp, API key và công thức giá.
2. Hệ thống đồng bộ hoặc kiểm tra tồn kho từ API bên thứ ba.
3. Khách hàng nạp tiền vào ví qua QR hoặc xác nhận thủ công.
4. Khách mua sản phẩm, hệ thống kiểm tra số dư, voucher và tồn kho.
5. Hệ thống tạo đơn, trừ ví, lấy hàng từ kho/API và trả hàng cho khách.
6. Nhật ký, doanh thu và leaderboard được cập nhật để đối soát.

## Quyết định kiến trúc quan trọng

| Vấn đề | Lựa chọn | Lý do |
|--------|----------|-------|
| Lấy hàng | Gọi API real-time khi mua | Tránh lệch kho, giảm rủi ro tồn hàng ảo |
| Thanh toán | Webhook xác thực chữ ký | Chống giả mạo giao dịch nạp tiền |
| Đa tổ chức | `X-Organization-Id` | Một hệ thống phục vụ nhiều tổ chức/đại lý |
| Phân quyền | RBAC + abilities | Backend chặn API, frontend ẩn/hiện UI theo quyền |

## Nhóm tài liệu liên quan

- API: [../api/README.md](../api/README.md)
- Kiến trúc code: [../architecture.md](../architecture.md)
- Backend guide: [../backend-guide.md](../backend-guide.md)
- Frontend guide: [../frontend-guide.md](../frontend-guide.md)
