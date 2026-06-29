# Tài Khoản, Tổ Chức & Phân Quyền

Phân hệ này quản lý người dùng, tổ chức, vai trò và quyền truy cập.

## Phạm vi

- Quản lý tài khoản: danh sách, trạng thái, thông tin cá nhân, số dư ví.
- Quản lý tổ chức: cây tổ chức, tổ chức công khai, tổ chức hiện hành.
- Quản lý role và permission theo tổ chức.
- Cung cấp abilities cho frontend để điều khiển UI.

## Vai trò chính

| Role | Ý nghĩa |
|------|---------|
| `admin` | Quản trị cao nhất, toàn quyền trong tổ chức |
| `ctv` | Cộng tác viên/đại lý, có thể áp dụng chính sách giá riêng |
| `user` | Khách hàng mua sản phẩm |

## Nguyên tắc

- User có thể thuộc nhiều tổ chức.
- Role được gán theo từng tổ chức, không mặc định áp dụng toàn hệ thống.
- Permission đặt dạng `subject.action`, ví dụ `users.index`, `orders.show`.
- Backend luôn là nơi quyết định cuối cùng về quyền truy cập.

API liên quan: [../api/auth.md](../api/auth.md), [../api/users-roles.md](../api/users-roles.md), [../api/organizations.md](../api/organizations.md).
