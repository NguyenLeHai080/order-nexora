# Order Nexora

Hệ thống bán **sản phẩm số** kết hợp mô hình **Đại lý/Cộng tác viên** (dropshipping/reseller) qua API bên thứ ba, có cổng thanh toán tự động.

Tách rõ **2 thư mục độc lập**:

```
order-nexora/
├── backend/     # FastAPI (Python 3.12) — REST API + Swagger
├── frontend/    # ReactJS (Vite + TS) — Admin dashboard
└── docs/        # Phân tích nghiệp vụ & quy ước API
```

📄 Tài liệu: [Phân tích nghiệp vụ](docs/business-analysis.md) · [Quy ước API](docs/api-conventions.md)

---

## Backend (FastAPI)

### Yêu cầu
- Python >= 3.12

### Chạy dev
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env            # rồi chỉnh JWT_SECRET, DATABASE_URL nếu cần
python -m app.seed              # tạo bảng + seed dữ liệu mẫu (admin@example.com / password)
uvicorn app.main:app --reload   # http://localhost:8000
```

- Swagger UI: http://localhost:8000/docs
- Health: `GET /api/health`
- Tài khoản seed: `admin@example.com` / `password`

### Kiểm thử & lint
```bash
cd backend
ruff check .      # lint
pytest -q         # test
```

### Cấu trúc
```
backend/app/
├── core/         # config, database, security(JWT), response envelope, repository, RBAC
├── database/     # đăng ký tập trung toàn bộ model
├── middleware/   # maintenance mode + ghi LogActivity
├── modules/      # auth, users, organizations, permissions, products,
│                 # suppliers, payments, orders, vouchers, settings, log_activities
└── main.py       # app factory: mount router + middleware + exception handler
```

---

## Frontend (ReactJS)

### Yêu cầu
- Node.js >= 20

### Chạy dev
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173  (proxy /api -> http://localhost:8000)
```

### Scripts
| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Build production |
| `npm run typecheck` | Kiểm tra type (tsc --noEmit) |
| `npm run lint` | ESLint |

### Cấu trúc (module-based)
```
frontend/src/
├── core/      # apiClient (axios + Bearer + X-Organization-Id), authStore (zustand), ProtectedRoute
├── layouts/   # AdminLayout (menu theo quyền)
└── modules/   # Auth, Dashboard, UserManagement (khuôn mẫu để nhân bản)
```

---

## Docker (backend)
```bash
cd backend
docker build -t order-nexora-backend .
docker run -p 8000:8000 -e JWT_SECRET=... order-nexora-backend
```

---

## Quy trình Git (Gitflow)
Ba nhánh chính:
- `prod` — production, chỉ merge sau khi kiểm tra kỹ (default branch)
- `staging` — QA test và demo
- `dev` — nhánh phát triển, nơi mọi feature merge vào

Quy ước nhánh:
- Feature: `feat/<tên>` (vd: `feat/login_page`), tách từ `dev`
- Hotfix: `hotfix/<tên>` (vd: `hotfix/fix_login_error`), tách từ `prod`

Quy ước commit: `feat: add homepage #id_issue`, `fix: resolve login bug #id_issue`.

### Luồng feature
1. Tách `feat/xxx` từ `dev`
2. Code, commit, push
3. Mở PR vào `dev`, review rồi merge
4. Khi ổn định: merge `dev` → `staging` để test/demo
5. Cuối cùng merge `staging` → `prod` để deploy

### Luồng hotfix
1. Tách `hotfix/xxx` từ `prod`
2. Fix, commit, push, mở PR vào `prod`
3. Sync ngược: merge `prod` → `staging` và `dev`

## CI/CD
- **CI** (`.github/workflows/ci.yml`): 2 job song song — backend (ruff + pytest), frontend (typecheck + build). Chạy trên PR/push vào `dev`, `staging`, `prod`.
- **CD** (`.github/workflows/cd.yml`): build & push Docker image backend lên GHCR khi push vào `staging`/`prod` hoặc tag `v*`.

Nhánh `prod` và `staging` được bảo vệ: chặn push trực tiếp, bắt buộc PR + 1 review + CI pass.
