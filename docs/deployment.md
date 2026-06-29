# Deployment tren Windows server

May server co the tu cap nhat khi branch `prod` co commit moi bang bo script trong `ops/`.

## Cach hoat dong

1. `ops/auto-deploy-prod.ps1` chay nen va poll `origin/prod`.
2. Khi thay commit moi, script goi `ops/deploy-prod.ps1`.
3. Deploy script fetch/checkout/reset ve `origin/prod`, cai dependency, build frontend, dung backend dang nghe cong `8000`.
4. `ops/watchdog.ps1` tu bat lai backend va Cloudflare tunnel.

## Cai watcher vao Windows Scheduled Task

Chay PowerShell tai root repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\install-auto-deploy-task.ps1 -StartNow
```

Task mac dinh ten `OrderNexoraAutoDeployProd` va tu chay khi user dang nhap vao Windows.

Neu Windows tu choi quyen tao Scheduled Task, dung cach khong can admin:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\install-auto-deploy-startup.ps1
```

Lenh nay tao shortcut trong Startup folder cua user hien tai.

## Luu y quan trong

- Server clone nen sach, khong dung lam noi code truc tiep.
- Neu worktree co thay doi local, deploy se dung lai de tranh ghi de code.
- Chi dung `-ForceDeploy` khi server clone chi phuc vu deploy va co the reset ve `origin/prod`.
- Remote Git dang dung HTTPS, server can co Git credential hop le de `git fetch origin prod` chay duoc.

## Log

- Auto watcher: `ops/auto-deploy-prod.log`
- Moi lan deploy: `ops/deploy-prod.log`
- Backend/tunnel watchdog: `ops/watchdog.log`
