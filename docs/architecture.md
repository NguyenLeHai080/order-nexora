# Kiến trúc hệ thống

## Tổng quan

Order Nexora gồm hai ứng dụng độc lập, giao tiếp qua HTTP/JSON:

```
┌─────────────────────┐       HTTP + JWT        ┌──────────────────────┐
│   Frontend (SPA)     │  ───────────────────▶   │   Backend (API)      │
│   React + Vite + TS  │  ◀───────────────────   │   FastAPI + SQLAlchemy│
│   :5173              │   envelope JSON          │   :8000               │
└─────────────────────┘                          └──────────┬───────────┘
                                                             │
                                                  ┌──────────▼───────────┐
                                                  │   Database            │
                                                  │   SQLite (dev)        │
                                                  │   PostgreSQL (prod)   │
                                                  └──────────────────────┘
```

- **Xác thực**: JWT Bearer token. Frontend lưu token và gửi kèm `Authorization: Bearer <token>`.
- **Đa tổ chức (multi-tenant)**: header `X-Organization-Id` xác định tổ chức hiện hành; backend tự lọc dữ liệu theo tổ chức.
- **Phân quyền (RBAC)**: quyền dạng `subject.action`, kiểm tra ở backend (dependency `require`) và ẩn/hiện UI ở frontend (`can`).

## Kiến trúc phân lớp backend

Mỗi request đi qua các lớp theo thứ tự, mỗi lớp một trách nhiệm:

```
HTTP request
   │
   ▼
┌─────────────┐   Middleware: log hoạt động, kiểm tra bảo trì
│ Middleware  │
└──────┬──────┘
   │
   ▼
┌─────────────┐   Router: khai báo endpoint, nhận/validate input (schema),
│  Router     │           kiểm tra quyền (require), trả envelope
└──────┬──────┘
   │
   ▼
┌─────────────┐   Service: logic nghiệp vụ phức tạp (vd: đặt đơn = trừ kho +
│  Service    │            trừ ví + áp voucher). Chỉ có ở module cần.
└──────┬──────┘
   │
   ▼
┌─────────────┐   Repository: truy vấn dữ liệu, lọc/sắp xếp/phân trang
│ Repository  │              (kế thừa BaseRepository)
└──────┬──────┘
   │
   ▼
┌─────────────┐   Model: ánh xạ bảng dữ liệu (SQLAlchemy)
│  Model      │
└─────────────┘
```

**Nguyên tắc**: lớp trên gọi lớp dưới, không gọi ngược. Router không truy vấn DB trực tiếp khi đã có repository; logic nghiệp vụ nhiều bước nằm ở service, không nhồi vào router.

### Khi nào cần `service.py`?

- **Có service**: orders (trừ kho + ví + voucher), payments (xác nhận nạp + cộng ví), vouchers (kiểm tra hiệu lực), auth, settings.
- **Không cần service**: module CRUD thuần (suppliers, products, organizations) — router gọi thẳng repository là đủ.

## Vòng đời một request (ví dụ `GET /api/suppliers`)

1. **Middleware** `MaintenanceMiddleware` kiểm tra cờ bảo trì; `LogActivityMiddleware` chuẩn bị ghi log.
2. **Router** `suppliers.index` chạy dependency:
   - `list_params` → parse `search/status/sort_by/limit/page...`
   - `require("suppliers.index")` → giải mã JWT, dựng `RequestContext` (user + organization), kiểm tra quyền. Thiếu quyền → `403`.
   - `get_db` → mở session DB.
3. **Repository** `SupplierRepository.paginate(params, organization_id=ctx.organization_id)` → dựng câu query có lọc + scope tổ chức + đếm tổng + phân trang.
4. **Router** bọc kết quả qua `paginated(...)` → envelope `{ success, data, meta }`.
5. **Middleware** ghi log hoạt động, trả response.

## Thành phần `core/` (hạ tầng dùng chung)

| File | Vai trò |
|------|---------|
| `config.py` | Đọc cấu hình từ `.env` (pydantic-settings), export `settings`. |
| `database.py` | Engine + Session + `Base`; dependency `get_db`. |
| `context.py` | `RequestContext` (user hiện tại + organization_id). |
| `response.py` | `success()`, `paginated()`, `Envelope`, `PageMeta`. |
| `pagination.py` | `ListParams` + `list_params` dependency (bộ lọc chuẩn). |
| `repository.py` | `BaseRepository`: CRUD + list/filter/sort/paginate dùng lại. |
| `security.py` | Băm/đối chiếu mật khẩu (bcrypt), tạo & giải mã JWT. |
| `abilities.py` | Chuyển `subject.action` → abilities cho CASL frontend. |
| `exceptions.py` | Exception nghiệp vụ + handler trả envelope lỗi. |
| `models.py` | Mixin cột dùng chung (id, created_at, updated_at). |

## Kiến trúc phân lớp frontend

```
Trang (pages)         ──▶ hiển thị + ghép các phần lại
   │
   ├─ components/      ──▶ component riêng của module
   ├─ hooks/           ──▶ logic gọi API (dùng apiClient)
   ├─ helpers/         ──▶ format/validate riêng module
   └─ config/          ──▶ hằng số, cột bảng, endpoint URL
            │
            ▼
   core/ (apiClient, authStore, useList, format)  ──▶ hạ tầng FE
   ui/   (Button, Input, Select...)               ──▶ component nguyên tử
   components/ (DataTable, Paginator, PageHeader)  ──▶ component bố cục
```

Chi tiết mô hình module xem [frontend-guide.md](frontend-guide.md).

## Bảo mật

- Mật khẩu băm bằng **bcrypt** (không lưu plaintext).
- JWT ký bằng `JWT_SECRET` — **bắt buộc đổi ở production**.
- Endpoint mặc định yêu cầu xác thực + quyền; chỉ `/auth/login` và `/api/health` là công khai.
- Upload chỉ nhận ảnh hợp lệ (kiểu MIME + giới hạn 5MB), đặt tên ngẫu nhiên tránh ghi đè.
- Dữ liệu được scope theo tổ chức ở tầng repository, hạn chế rò rỉ chéo tổ chức.

## CI/CD

- **CI** (`.github/workflows/ci.yml`): job `backend` (ruff + pytest) và `frontend` (typecheck + build), chạy trên mỗi push/PR.
- **CD** (`.github/workflows/cd.yml`): build & push Docker image backend lên GitHub Container Registry.
