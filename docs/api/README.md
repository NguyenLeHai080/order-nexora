# API

Khu vực này gom tài liệu API theo nhóm nhỏ để dễ cập nhật khi thêm endpoint.

Tiền tố chung: `/api`. Quy ước response, phân trang, auth, multi-tenancy và mã lỗi xem [conventions.md](conventions.md).

Tài liệu tương tác khi chạy backend: `http://localhost:8000/docs`.

## Mục lục

| Tài liệu | Nội dung |
|----------|----------|
| [conventions.md](conventions.md) | Quy ước API chung: envelope, phân trang, auth, RBAC |
| [auth.md](auth.md) | Đăng nhập, đăng xuất, đổi tổ chức, thông tin user hiện tại |
| [users-roles.md](users-roles.md) | Users, roles, permissions |
| [organizations.md](organizations.md) | Tổ chức, cây tổ chức, public options |
| [catalog.md](catalog.md) | Products, suppliers, vouchers |
| [orders.md](orders.md) | Đơn hàng, đơn của tôi, leaderboard |
| [payments.md](payments.md) | Ngân hàng, nạp tiền, webhook thanh toán |
| [operations.md](operations.md) | Settings, log activities, uploads, health check |
| [partner-ctv.md](partner-ctv.md) | Hướng dẫn tích hợp API cho CTV |
| [vdstore.md](vdstore.md) | Tài liệu driver tích hợp VD Store |

## Khi thêm endpoint

1. Cập nhật file API đúng nhóm nghiệp vụ.
2. Nếu endpoint thay đổi convention chung, cập nhật [conventions.md](conventions.md).
3. Kiểm tra Swagger `/docs` vì đây là nguồn đối chiếu trực tiếp từ code.
