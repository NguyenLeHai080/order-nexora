# Tài liệu dự án Order Nexora

Hệ thống bán sản phẩm số + đại lý/CTV. Backend dùng **FastAPI**, frontend dùng **React + Vite + TypeScript**.

Tài liệu được chia theo nhóm để dễ quản lý:

- `business/`: tài liệu nghiệp vụ theo phân hệ.
- `api/`: quy ước API và endpoint theo nhóm API nhỏ.
- Các guide ở cấp `docs/`: kiến trúc, backend, frontend, UI kit, đóng góp.

## Mục lục

| Tài liệu | Nội dung | Dành cho |
|----------|----------|----------|
| [getting-started.md](getting-started.md) | Cài đặt môi trường, chạy backend + frontend lần đầu | Mọi người |
| [architecture.md](architecture.md) | Kiến trúc tổng thể, vòng đời request, kiến trúc phân lớp | Mọi người |
| [backend-guide.md](backend-guide.md) | Cấu trúc backend, cách thêm API/module mới | Backend dev |
| [frontend-guide.md](frontend-guide.md) | Mô hình module FE, assets, SCSS, cách thêm màn hình mới | Frontend dev |
| [ui-kit.md](ui-kit.md) | Thư viện component dùng chung | Frontend dev |
| [deployment.md](deployment.md) | Cấu hình server tự cập nhật khi `prod` có code mới | DevOps |
| [api/README.md](api/README.md) | Tài liệu API, chia nhỏ theo nhóm endpoint | Mọi người |
| [business/README.md](business/README.md) | Tài liệu nghiệp vụ, chia nhỏ theo phân hệ | PO / dev |
| [contributing.md](contributing.md) | Git, commit, PR, review, Definition of Done | Mọi người |

## Sơ đồ thư mục tài liệu

```text
docs/
├── api/
│   ├── README.md
│   ├── conventions.md
│   ├── auth.md
│   ├── users-roles.md
│   ├── organizations.md
│   ├── catalog.md
│   ├── orders.md
│   ├── payments.md
│   ├── operations.md
│   ├── partner-ctv.md
│   └── vdstore.md
├── business/
│   ├── README.md
│   ├── overview.md
│   ├── identity-access.md
│   ├── sales-orders.md
│   ├── payments.md
│   ├── inventory-integrations.md
│   └── settings-operations.md
├── architecture.md
├── backend-guide.md
├── frontend-guide.md
├── getting-started.md
├── deployment.md
├── ui-kit.md
└── contributing.md
```

## Sơ đồ thư mục cấp cao

```text
order-nexora/
├── backend/            # API FastAPI
├── frontend/           # SPA React + Vite + TS
├── docs/               # tài liệu dự án
├── ops/                # script vận hành local/server
└── .github/workflows/  # CI/CD
```

## Quy ước nhanh

- **Ngôn ngữ giao tiếp & comment**: tiếng Việt.
- **Branch**: `feature/<mã-task>-mô-tả`, `fix/...`, `chore/...`.
- **API envelope**: mọi response dạng `{ success, message, data }`, thêm `meta` khi phân trang.
- **Quyền**: định dạng `subject.action`, ví dụ `users.index`.
