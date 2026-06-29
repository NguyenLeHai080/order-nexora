# Cài Đặt & Vận Hành

Phân hệ này bao gồm cấu hình hệ thống, voucher, bảo trì, upload và nhật ký hoạt động.

## Phạm vi

- Cấu hình key-value của hệ thống.
- Bật/tắt chế độ bảo trì.
- Quản lý voucher và hiệu lực sử dụng.
- Upload ảnh phục vụ sản phẩm, ngân hàng hoặc nội dung vận hành.
- Nhật ký hoạt động để audit và đối soát.

## Voucher

- Hỗ trợ giảm theo phần trăm hoặc số tiền cố định.
- Có thể giới hạn thời gian và số lượt dùng.
- Được kiểm tra trong luồng tạo đơn để tránh dùng sai trạng thái.

## Bảo trì

- Khi bật bảo trì, backend có thể chặn các API nghiệp vụ.
- Các route cần mở trong bảo trì: login, docs, health check và route vận hành cần thiết.

## Nhật ký

- Ghi lại hành động quan trọng: đăng nhập, thay đổi dữ liệu, nạp tiền, tạo đơn.
- Hỗ trợ lọc, thống kê, xóa theo ngày hoặc xóa hàng loạt.

API liên quan: [../api/operations.md](../api/operations.md), [../api/catalog.md](../api/catalog.md).
