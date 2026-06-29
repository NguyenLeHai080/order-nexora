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
$PidFile   = Join-Path $Root 'ops\watchdog.pid'
$WorkerCount = 1

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

function Stop-IfDuplicateWatchdog {
    if (-not (Test-Path $PidFile)) {
        return
    }

    $oldPid = (Get-Content -Path $PidFile -Raw -ErrorAction SilentlyContinue).Trim()
    if ($oldPid -and $oldPid -ne "$PID") {
        $oldProcess = Get-Process -Id ([int]$oldPid) -ErrorAction SilentlyContinue
        if ($oldProcess) {
            Write-Log "another watchdog is already running (pid $oldPid), exiting pid $PID"
            exit 0
        }
    }
}

function Remove-StaleBackendProcesses {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort 8000 -ErrorAction SilentlyContinue
    foreach ($conn in $listeners) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($conn.OwningProcess)" -ErrorAction SilentlyContinue
        if ($proc -and $proc.CommandLine -notlike "*$Backend*") {
            Write-Log "stopping stale backend pid $($conn.OwningProcess)"
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

Stop-IfDuplicateWatchdog
Set-Content -Path $PidFile -Value $PID -Encoding ascii
Write-Log "watchdog started (pid $PID)"

while ($true) {
    # --- Backend uvicorn :8000 ---
    if (-not (Test-Port 8000)) {
        Remove-StaleBackendProcesses
        Write-Log "backend down -> starting uvicorn :8000"
        Start-Process -FilePath $Python `
            -ArgumentList '-m','uvicorn','app.main:app','--host','0.0.0.0','--port','8000','--proxy-headers','--forwarded-allow-ips','*','--workers',"$WorkerCount" `
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
