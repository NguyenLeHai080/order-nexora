# Quy Ước API — Order Nexora

Tài liệu chuẩn hóa cách backend (FastAPI) phản hồi, xác thực và phân trang. Mọi module mới phải tuân theo để frontend dùng được một `apiClient` duy nhất.

---

## 1. Base URL & Swagger

- Tiền tố: `/api` (cấu hình `API_PREFIX`).
- Swagger UI: `GET /docs` — test trực tiếp mọi endpoint, nhóm theo tag module.
- OpenAPI JSON: `GET /openapi.json`.
- Health check: `GET /api/health` → `{ "status": "ok" }`.

---

## 2. Response Envelope

Mọi phản hồi thành công bọc trong cấu trúc thống nhất:

```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": { }
}
```

| Trường | Kiểu | Ý nghĩa |
|--------|------|---------|
| `success` | bool | Luôn `true` khi 2xx |
| `message` | string \| null | Thông điệp hiển thị cho người dùng (tùy chọn) |
| `data` | any | Payload thực tế (object, array, hoặc null) |

**Lỗi** trả về `success: false` kèm HTTP status phù hợp (400/401/403/404/422):

```json
{
  "success": false,
  "message": "Không tìm thấy tài nguyên",
  "data": null
}
```

---

## 3. Phân trang (Pagination)

Endpoint dạng danh sách trả `data` là mảng kèm `meta`:

```json
{
  "success": true,
  "message": null,
  "data": [ /* items */ ],
  "meta": {
    "current_page": 1,
    "from": 1,
    "to": 20,
    "per_page": 20,
    "last_page": 5,
    "total": 100
  }
}
```

---

## 4. Tham số lọc chuẩn (List Query Params)

Mọi endpoint danh sách hỗ trợ bộ tham số chung:

| Param | Mặc định | Mô tả |
|-------|----------|-------|
| `search` | — | Tìm theo từ khóa (cột do module quy định) |
| `status` | — | Lọc theo trạng thái |
| `from_date` / `to_date` | — | Khoảng thời gian (ISO 8601) |
| `sort_by` | tùy module | Cột sắp xếp (chỉ chấp nhận cột trong whitelist) |
| `sort_order` | `desc` | `asc` \| `desc` |
| `limit` | `20` | Số bản ghi / trang (1–100) |
| `page` | `1` | Trang hiện tại |

> `sort_by` chạy qua whitelist trong từng repository để tránh SQL injection / lộ cột nội bộ.

---

## 5. Xác thực (Authentication)

- Cơ chế: **JWT Bearer**.
  ```
  Authorization: Bearer <access_token>
  ```
- Lấy token: `POST /api/auth/login` → `data.token`.
- Các route `/api/auth/*` **không** yêu cầu token (trừ `/auth/user`, `/auth/logout`, `/auth/switch-organization`).
- Token hết hạn hoặc sai → `401 Unauthorized` → frontend tự logout.

---

## 6. Đa tổ chức (Multi-Tenancy)

- Hầu hết endpoint cần header:
  ```
  X-Organization-Id: <organization_id>
  ```
- Backend dùng giá trị này để giới hạn dữ liệu theo tổ chức (org-scoped).
- Vai trò (role) được phân giải **theo tổ chức đang chọn** — user có thể là admin ở org này, user thường ở org khác.
- Đổi tổ chức làm việc: `POST /api/auth/switch-organization` `{ "organization_id": ... }`.
- Frontend tự gắn header này (zustand lưu `organizationId`); ngoại lệ là các route `/auth/*`.

---

## 7. Phân quyền (RBAC + Abilities)

- Permission đặt tên `"<subject>.<action>"`, ví dụ `users.index`, `products.create`.
- 5 action chuẩn: `index` (xem danh sách), `show`, `create`, `update`, `destroy`.
- Backend chặn ở dependency `require("users.create")` trên từng route. `admin` bỏ qua mọi kiểm tra.
- Sau login, `data.abilities` trả mảng kiểu CASL để frontend ẩn/hiện UI:
  ```json
  [{ "action": "index", "subject": "User" }, { "action": "create", "subject": "Product" }]
  ```
- Frontend: `authStore.can(action, subject)` hoặc `hasPermission("users.index")`.

---

## 8. Mã trạng thái HTTP

| Status | Khi nào |
|--------|---------|
| 200 | Thành công (GET/PUT/POST hành động) |
| 201 | Tạo mới thành công |
| 400 | Lỗi nghiệp vụ (số dư không đủ, voucher hết hạn...) |
| 401 | Chưa/đã hết hạn đăng nhập |
| 403 | Không đủ quyền |
| 404 | Không tìm thấy |
| 422 | Dữ liệu gửi lên không hợp lệ (Pydantic validation) |

---

## 9. Ví dụ luồng đầy đủ

```bash
# 1. Đăng nhập
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
# → { success, data: { token, user, abilities, organizations } }

# 2. Gọi API cần auth + tổ chức
curl http://localhost:8000/api/users \
  -H "Authorization: Bearer <token>" \
  -H "X-Organization-Id: 1"

# 3. Mua hàng
curl -X POST http://localhost:8000/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "X-Organization-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":1,"voucher_code":"SALE10"}'
```
