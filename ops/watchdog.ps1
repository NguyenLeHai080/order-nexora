# Watchdog giữ backend + Cloudflare tunnel sống mãi (không cần quyền admin).
# - Tự bật lại uvicorn (cổng 8000) nếu chết.
# - Tự bật lại cloudflared tunnel (nexoratech.com.vn -> :8000) nếu chết.
# Chạy ngầm, kiểm tra mỗi 20 giây. Ghi log ra ops/watchdog.log.

$ErrorActionPreference = 'SilentlyContinue'

$Root      = 'd:\Projects\order-nexora'
$Backend   = Join-Path $Root 'backend'
$Python    = Join-Path $Backend '.venv\Scripts\python.exe'
$TokenFile = Join-Path $env:USERPROFILE '.cloudflared\token.txt'
$LogFile   = Join-Path $Root 'ops\watchdog.log'

function Write-Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LogFile -Value "$ts  $msg" -Encoding utf8
}

function Test-Port($port) {
    $c = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    return [bool]$c
}

function Test-Cloudflared {
    return [bool](Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue)
}

Write-Log "watchdog started (pid $PID)"

while ($true) {
    # --- Backend uvicorn :8000 ---
    if (-not (Test-Port 8000)) {
        Write-Log "backend down -> starting uvicorn :8000"
        Start-Process -FilePath $Python `
            -ArgumentList '-m','uvicorn','app.main:app','--host','0.0.0.0','--port','8000' `
            -WorkingDirectory $Backend -WindowStyle Hidden
        Start-Sleep -Seconds 5
    }

    # --- Cloudflare tunnel ---
    if (-not (Test-Cloudflared)) {
        if (Test-Path $TokenFile) {
            $token = (Get-Content -Path $TokenFile -Raw).Trim()
            Write-Log "tunnel down -> starting cloudflared"
            Start-Process -FilePath 'cloudflared' `
                -ArgumentList 'tunnel','run','--token',$token `
                -WindowStyle Hidden
            Start-Sleep -Seconds 5
        } else {
            Write-Log "WARN: token file not found at $TokenFile"
        }
    }

    Start-Sleep -Seconds 20
}
