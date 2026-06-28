# order-nexora

Order Nexora service — Node.js + TypeScript + Express.

## Yêu cầu
- Node.js >= 20
- npm

## Bắt đầu
```bash
npm install
npm run dev      # chạy dev server (tsx watch) tại http://localhost:3000
```

Kiểm tra health: `GET /health` → `{ "status": "ok", "service": "order-nexora" }`

## Scripts
| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy dev server với hot reload |
| `npm run build` | Biên dịch TypeScript sang `dist/` |
| `npm start` | Chạy bản build (`dist/server.js`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Kiểm tra type (không emit) |
| `npm test` | Chạy test với Vitest |

## Docker
```bash
docker build -t order-nexora .
docker run -p 3000:3000 order-nexora
```

## Quy trình Git (Gitflow)
Ba nhánh chính:
- `prod` — production, chỉ merge sau khi kiểm tra kỹ (default branch)
- `staging` — QA test và demo
- `dev` — nhánh phát triển, nơi mọi feature merge vào

Quy ước nhánh:
- Feature: `feat/<tên>` (vd: `feat/login_page`), tách từ `dev`
- Hotfix: `hotfix/<tên>` (vd: `hotfix/fix_login_error`), tách từ `prod`

Quy ước commit: `feat: add homepage #id_issue`, `fix: resolve login bug #id_issue` (phần lớn commit kèm issue ID).

### Luồng feature
1. Tách `feat/xxx` từ `dev`
2. Code, commit, push
3. Mở PR vào `dev`, review rồi merge
4. Khi ổn định: merge `dev` → `staging` để test/demo
5. Cuối cùng merge `staging` (hoặc `dev`) → `prod` để deploy

### Luồng hotfix
1. Tách `hotfix/xxx` từ `prod`
2. Fix, commit, push
3. Mở PR vào `prod`, merge sau khi review
4. Sync ngược: merge `prod` → `staging` và `dev`

## CI/CD
- **CI** (`.github/workflows/ci.yml`): lint → typecheck → test → build, chạy trên PR/push vào `dev`, `staging`, `prod`.
- **CD** (`.github/workflows/cd.yml`): build & push Docker image lên GHCR khi push vào `staging`/`prod` hoặc tag `v*`.

Nhánh `prod` và `staging` được bảo vệ: chặn push trực tiếp, bắt buộc PR + 1 review + CI pass.
