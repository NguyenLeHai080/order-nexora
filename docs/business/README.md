# Nghiệp vụ

Khu vực này tách tài liệu theo phân hệ để PO, dev backend và dev frontend dễ tìm đúng luồng đang làm.

## Mục lục

| Tài liệu | Nội dung |
|----------|----------|
| [overview.md](overview.md) | Tổng quan mô hình vận hành và quyết định kiến trúc |
| [identity-access.md](identity-access.md) | Tài khoản, tổ chức, vai trò, phân quyền |
| [sales-orders.md](sales-orders.md) | Sản phẩm, mua hàng, đơn hàng, leaderboard |
| [payments.md](payments.md) | Ví, nạp tiền, ngân hàng, webhook |
| [inventory-integrations.md](inventory-integrations.md) | Nhà cung cấp, kho hàng, tích hợp API bên thứ ba |
| [settings-operations.md](settings-operations.md) | Voucher, bảo trì, cấu hình, nhật ký vận hành |

## Quy ước cập nhật

- Mỗi phân hệ nghiệp vụ có một file riêng.
- Khi thay đổi luồng API, cập nhật thêm tài liệu tương ứng trong [../api](../api/README.md).
- Khi thay đổi cấu trúc code, cập nhật [../architecture.md](../architecture.md), [../backend-guide.md](../backend-guide.md) hoặc [../frontend-guide.md](../frontend-guide.md).
