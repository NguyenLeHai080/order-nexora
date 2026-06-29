# Ví & Thanh Toán

Phân hệ này quản lý số dư ví, ngân hàng nhận tiền, yêu cầu nạp và webhook thanh toán.

## Phạm vi

- Danh sách ngân hàng nhận tiền.
- QR nạp tiền cố định hoặc QR sinh theo yêu cầu nạp.
- Lịch sử nạp tiền và trạng thái xác nhận.
- Webhook báo có từ cổng/ngân hàng.
- Admin cộng/trừ số dư khi cần xử lý thủ công.

## Luồng nạp tiền

1. User tạo yêu cầu nạp tiền.
2. Hệ thống sinh mã giao dịch hoặc nội dung chuyển khoản định danh.
3. User chuyển khoản theo QR/thông tin ngân hàng.
4. Webhook thanh toán gửi giao dịch về backend.
5. Backend xác thực chữ ký, đối soát số tiền và cộng ví.
6. Nếu webhook lỗi, admin có thể xác nhận thủ công sau khi kiểm tra.

## Nguyên tắc an toàn

- Không cộng ví nếu webhook chưa xác thực.
- Mỗi giao dịch nạp cần có mã định danh để tránh cộng trùng.
- Mọi thay đổi số dư phải ghi log.

API liên quan: [../api/payments.md](../api/payments.md), [../api/users-roles.md](../api/users-roles.md).
