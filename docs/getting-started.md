# Bắt đầu — cài đặt & chạy dự án

Hướng dẫn dựng môi trường dev từ con số 0. Thời gian ước tính: ~15 phút.

## Yêu cầu

| Công cụ | Phiên bản | Ghi chú |
|---------|-----------|---------|
| Python | 3.12+ | backend |
| Node.js | 20+ | frontend |
| Git | mới nhất | |

## 1. Clone & cấu trúc

```bash
git clone <repo-url> order-nexora
cd order-nexora
```

Hai phần backend và frontend nằm ở hai thư mục tách biệt, chạy độc lập.

## 2. Backend (FastAPI)

```bash
cd backend

# Tạo virtualenv
python -m venv .venv

# Kích hoạt (Windows PowerShell)
.venv\Scripts\Activate.ps1
# hoặc Git Bash: source .venv/Scripts/activate
# hoặc macOS/Linux: source .venv/bin/activate

# Cài thư viện
pip install -r requirements.txt
pip install -r requirements-dev.txt   # ruff, pytest cho dev

# Tạo file cấu hình từ mẫu
cp .env.example .env
```

Khởi tạo dữ liệu mẫu (tài khoản admin + phân quyền):

```bash
python -m app.seed
```

Chạy server (mặc định cổng 8000):

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs (Swagger): http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

**Tài khoản mặc định** (từ seed): `admin@example.com` / `password`.

## 3. Frontend (React + Vite)

Mở terminal mới:

```bash
cd frontend
npm install
npm run dev
```

- Giao diện: http://localhost:5173
- Vite proxy sẵn `/api` và `/uploads` sang backend `:8000`, không cần cấu hình thêm.

## 4. Lệnh thường dùng

### Backend
```bash
ruff check .          # lint
ruff check . --fix    # tự sửa lỗi lint
pytest -q             # chạy test
```

### Frontend
```bash
npm run dev           # dev server
npm run build         # build production (tsc + vite)
npm run typecheck     # kiểm tra kiểu, không build
npm run lint          # eslint
```

## 5. Biến môi trường (backend/.env)

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `APP_ENV` | `local` | `local` / `staging` / `prod` |
| `DEBUG` | `true` | bật chi tiết lỗi |
| `API_PREFIX` | `/api` | tiền tố mọi endpoint |
| `DATABASE_URL` | `sqlite:///./order_nexora.db` | đổi sang Postgres ở production |
| `JWT_SECRET` | `change-me-in-production` | **bắt buộc đổi ở production** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | hạn token (phút) |
| `CORS_ORIGINS` | `localhost:3000,5173` | domain frontend được phép gọi |

## Sự cố thường gặp

- **`ModuleNotFoundError: No module named 'app'`** khi chạy pytest: chạy từ thư mục `backend/`. Cấu hình `pythonpath = ["."]` trong `pyproject.toml` đã xử lý việc này.
- **Cổng 5173/8000 bận**: đổi cổng (`--port` cho uvicorn, `server.port` trong `vite.config.ts`) hoặc tắt tiến trình cũ.
- **Ảnh QR upload không hiển thị**: kiểm tra backend đang chạy (Vite proxy `/uploads` sang `:8000`).
