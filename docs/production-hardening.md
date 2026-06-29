# Production hardening

Mục tiêu production lớn:

- Dùng PostgreSQL thay SQLite khi có giao dịch thật hoặc nhiều user đồng thời.
- Có backup tự động và kiểm tra restore định kỳ.
- Chạy backend qua service/watchdog ổn định, không phụ thuộc cửa sổ terminal.
- Không đưa secret/token vào Git.
- Log có xoay vòng, không để đầy ổ đĩa.

## Database

Hiện app hỗ trợ:

- SQLite: phù hợp giai đoạn đầu, ít đồng thời.
- PostgreSQL: khuyến nghị production lớn.

Ví dụ `DATABASE_URL`:

```env
DATABASE_URL=postgresql+psycopg://order_nexora:strong_password@127.0.0.1:5432/order_nexora
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
DB_POOL_RECYCLE_SECONDS=1800
```

Máy server hiện chưa có PostgreSQL client tools (`psql`, `pg_dump`) và chưa có Docker, nên cần cài PostgreSQL riêng trước khi chuyển DB thật.

Server hiện tại đã chuyển sang PostgreSQL local:

- Service: `postgresql-x64-17`
- Database: `order_nexora`
- App user: `order_nexora_app`
- Credential riêng của server: `ops/postgres-credentials.txt` (đã ignore khỏi Git)
- App config thật: `backend/.env` (đã ignore khỏi Git)

Migration từ SQLite sang PostgreSQL dùng:

```powershell
.\backend\.venv\Scripts\python.exe .\ops\migrate-sqlite-to-postgres.py `
  --sqlite-path .\backend\order_nexora.db `
  --postgres-url "postgresql+psycopg://order_nexora_app:<password>@127.0.0.1:5432/order_nexora" `
  --truncate
```

Trong lần chuyển đầu tiên có 1 invoice cũ bị bỏ qua vì trỏ tới `order_id` không còn tồn tại trong bảng `orders`. PostgreSQL chặn đúng ràng buộc FK, còn SQLite trước đó cho phép dữ liệu mồ côi.

## Backup

Chạy backup thủ công:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\backup-db.ps1
```

Cài backup task hàng ngày:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\install-backup-task.ps1 -At 03:00
```

Nếu Windows từ chối quyền Scheduled Task, chạy backup bằng Task Scheduler UI hoặc cron/agent ngoài.

## Log rotation

Chạy xoay log thủ công:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\rotate-logs.ps1
```

Script sẽ archive log trong `ops/` khi file vượt ngưỡng và xóa archive cũ theo `KeepDays`.

## Runtime

`ops/watchdog.ps1` giữ backend và Cloudflare tunnel sống. Backend chạy:

```text
uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips * --workers 2
```

Khi traffic tăng, nên chuyển sang Windows Service/NSSM hoặc Linux systemd, và tăng workers theo CPU/RAM thực tế.

## Deploy

`ops/deploy-prod.ps1` mặc định chỉ cài `requirements.txt`. Dev dependencies chỉ cài khi truyền:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\deploy-prod.ps1 -InstallDevDependencies
```

Auto deploy vẫn theo dõi `origin/prod` qua `ops/auto-deploy-prod.ps1`.
