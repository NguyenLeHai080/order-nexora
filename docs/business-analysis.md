# Order Nexora — Phân Tích Nghiệp Vụ & Kiến Trúc Hệ Thống

> Hệ thống bán **sản phẩm số** (tài liệu, tài nguyên) kết hợp mô hình **Đại lý/Cộng tác viên** (dropshipping/reseller) qua API bên thứ ba, tích hợp cổng thanh toán tự động.

---

## I. Tổng Quan Hệ Thống

### Luồng vận hành cơ bản

**1. Quản lý nguồn hàng (Admin)**
```
Kết nối API Nhà cung cấp (bên thứ 3)
  → Đồng bộ/đọc kho hàng
  → Cấu hình công thức tăng giá (Giá bán = Giá kho + % lợi nhuận hoặc + số tiền cố định)
  → Tạo sản phẩm trên hệ thống
```

**2. Khách hàng & dòng tiền**
```
Khách nạp tiền (QR tự động / thủ công)
  → Tiền vào ví (số dư)
  → Khách mua tài liệu
  → Hệ thống kiểm tra kho / gọi API bên thứ 3 (real-time)
  → Trả "hàng" cho khách (link/key/nội dung)
  → Ghi nhận doanh thu + cập nhật bảng xếp hạng
```

### Quyết định kiến trúc quan trọng

| Vấn đề | Lựa chọn | Lý do |
|--------|----------|-------|
| Cơ chế lấy hàng | **Gọi API real-time khi khách bấm mua** | Tránh đọng vốn, không lệch kho. (Có thể bổ sung cache cho sản phẩm phổ biến.) |
| Bảo mật nạp tiền | **Webhook xác thực chữ ký HMAC** | Chống user "fake" hóa đơn nạp tiền |
| Đa tổ chức | **Multi-tenant qua `X-Organization-Id`** | Một hệ thống phục vụ nhiều đại lý/tổ chức |
| Phân quyền | **RBAC + abilities (CASL-style)** | Frontend ẩn/hiện UI theo quyền, backend chặn ở API |

---

## II. Phân Tích Nghiệp Vụ Chi Tiết (Admin Dashboard)

### 1. Phân hệ Quản lý Tài khoản & Phân quyền
- **Quản lý tài khoản**: danh sách, trạng thái (hoạt động/khóa), số dư ví của toàn bộ user.
- **3 role chính**:
  - `admin` — quản trị tối cao, toàn quyền.
  - `ctv` (Cộng tác viên) — có thể có chính sách giá riêng (chiết khấu).
  - `user` (Khách hàng) — mua hàng thông thường.
- Vai trò gán **theo từng tổ chức** (team-scoped): user có thể là admin ở tổ chức A nhưng user thường ở tổ chức B.

### 2. Phân hệ Kinh doanh & Đơn hàng (Sales & Analytics)
- **Mua tài liệu**: quản lý "Khách X đã mua sản phẩm Y", trạng thái đơn (thành công/thất bại/đang xử lý).
- **Lịch sử mua hàng**: log thời gian, số tiền, sản phẩm, mã đơn để đối soát.
- **Bảng xếp hạng**: thống kê theo bộ lọc (tuần/tháng) số tiền đã chi để làm event đua top.

### 3. Phân hệ Cổng thanh toán (Billing & Payment)
- **Ngân hàng nhận tiền**: cấu hình danh sách ngân hàng.
- **Quản lý QR**:
  - *QR sẵn*: upload ảnh QR cố định, user quét và nhập tay nội dung.
  - *QR tự động* (đề xuất): dùng VietQR/PayOS/Casso sinh QR kèm sẵn **số tiền + nội dung định danh** (vd `NAPTIEN-U123-AB12`).
- **Quản lý dòng tiền**: lịch sử nạp, biến động số dư, admin cộng/trừ tay khi cần.

### 4. Phân hệ Kho hàng & Tích hợp (Supplier & API Integration)
- **Affiliate API**: cấu hình API Key, Endpoint của đối tác.
- **Kho hàng**: kiểm tra tồn kho bên thứ 3 (trigger khi mua hoặc cronjob).
- **Sản phẩm**: lấy giá gốc, áp công thức:
  ```
  Giá bán = Giá kho × (1 + markup_percent / 100) + markup_amount
  ```
  Admin điều chỉnh % theo từng sản phẩm hoặc toàn mục.

### 5. Phân hệ Cài đặt Hệ thống (System Settings)
- **Voucher**: mã giảm theo số tiền/phần trăm, giới hạn thời gian + lượt dùng.
- **Bảo trì**: bật/tắt — khi bật, chặn mọi API mua bán (trừ login/docs).
- **Domain & Server**: lưu cấu hình hạ tầng để theo dõi (mở rộng sau).

---

## III. Kiến Trúc Mã Nguồn

Dự án tách **2 thư mục độc lập**:

```
order-nexora/
├── backend/     # FastAPI (Python) — API + Swagger /docs
├── frontend/    # ReactJS (Vite + TS) — Admin dashboard module-based
└── docs/        # Tài liệu phân tích & quy ước
```

### Backend (FastAPI — Clean & Module-based)

```
backend/app/
├── core/                # Nền tảng dùng chung
│   ├── config.py        # Cấu hình (ENV)
│   ├── database.py      # SQLAlchemy engine/session/Base
│   ├── security.py      # Hash mật khẩu (bcrypt) + JWT
│   ├── response.py      # Envelope {success, message, data} + pagination
│   ├── pagination.py    # ListParams chuẩn (search/status/sort/limit/page)
│   ├── repository.py    # BaseRepository CRUD + filter + paginate
│   ├── context.py       # RequestContext (user + org + roles + permissions)
│   ├── abilities.py     # permission → ability (CASL)
│   ├── exceptions.py    # Lỗi nghiệp vụ + handler
│   └── models.py        # Mixin: PK, timestamps, org-scoped
├── database/            # Đăng ký tập trung toàn bộ model
├── middleware/          # Maintenance mode + ghi LogActivity
├── modules/             # Mỗi nghiệp vụ 1 thư mục
│   ├── auth/            # login, logout, switch-org, forgot/reset, RBAC
│   ├── users/           # CRUD user + ví (balance)
│   ├── organizations/   # CRUD tổ chức (cây parent_id), tree, public
│   ├── permissions/     # Role, Permission
│   ├── log_activities/  # Nhật ký hoạt động
│   ├── settings/        # Cấu hình + maintenance
│   ├── suppliers/       # Nhà cung cấp + API affiliate
│   ├── products/        # Sản phẩm + công thức giá
│   ├── payments/        # Ngân hàng, QR, nạp tiền, webhook
│   ├── orders/          # Mua hàng, lịch sử, bảng xếp hạng
│   └── vouchers/        # Mã giảm giá
└── main.py              # Mount router + middleware + exception handler
```

**Mỗi module** theo khuôn: `models.py` (ORM) → `schemas.py` (Pydantic) → `repository.py` (truy vấn) → `service.py` (nghiệp vụ) → `router.py` (endpoint). Module đơn giản có thể bỏ `service`/`repository`.

### Frontend (ReactJS — Module-based)

```
frontend/src/
├── components/          # Component dùng chung (Button, Input, Table...)
├── core/                # apiClient (axios), authStore (zustand), ProtectedRoute
├── layouts/             # AdminLayout, (UserLayout, MaintenanceLayout sau)
└── modules/             # Chia theo nghiệp vụ
    ├── Auth/            # authApi + LoginPage
    ├── Dashboard/
    └── UserManagement/  # KHUÔN MẪU để nhân bản
        ├── config/      # endpoint, cột bảng, hằng số
        ├── hooks/       # useFetchUsers (logic API)
        ├── components/  # component con của module
        └── pages/       # UserListPage (giao diện)
```

**Ưu điểm**: sửa module nào chỉ vào đúng thư mục đó, không ảnh hưởng phần khác. Thêm module mới = copy cấu trúc `UserManagement`.

---

## IV. Quy Ước API

Xem chi tiết trong [api-conventions.md](api-conventions.md). Tóm tắt:

- **Response envelope**: `{ "success": bool, "message": str|null, "data": any }`.
- **Phân trang**: `{ "data": [...], "meta": { current_page, last_page, per_page, total, from, to } }`.
- **Auth**: `Authorization: Bearer {token}` (JWT). Các route `/auth/*` không cần tổ chức.
- **Đa tổ chức**: header `X-Organization-Id: {id}` cho hầu hết endpoint cần auth.
- **Bộ lọc list chuẩn**: `search, status, from_date, to_date, sort_by, sort_order, limit (1-100), page`.
- **Swagger UI**: `/docs` — test trực tiếp, chia nhóm theo module.

---

## V. Công Nghệ

| Lớp | Công nghệ |
|-----|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, python-jose (JWT), passlib (bcrypt) |
| DB | SQLite (dev) → PostgreSQL (prod) qua `DATABASE_URL` |
| Frontend | ReactJS 18, Vite, TypeScript, axios, react-router, zustand |
| CI/CD | GitHub Actions (ruff + pytest + FE build), Docker (GHCR) |
| Git | Gitflow: `prod` / `staging` / `dev` |

---

## VI. Đề Xuất Mở Rộng (Next Steps)

1. **Tích hợp supplier thật**: thay `_fetch_from_supplier` (đang giả lập) bằng gọi `httpx` tới endpoint nhà cung cấp với `api_key`.
2. **Webhook cổng thật**: nối VietQR/PayOS/Casso, xác thực chữ ký theo chuẩn từng nhà cung cấp.
3. **Migration**: thêm Alembic thay cho `create_all` khi lên production.
4. **Cronjob đồng bộ kho**: worker định kỳ cập nhật `stock_status`/giá gốc.
5. **Idempotency mua hàng**: thêm khóa giao dịch tránh double-charge khi client retry.
6. **Reset password thật**: lưu token reset vào DB/Redis kèm hạn (hiện demo lưu in-memory).
