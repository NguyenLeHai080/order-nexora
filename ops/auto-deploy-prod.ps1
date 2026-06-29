param(
    [string]$Root = 'D:\Projects\order-nexora',
    [string]$Branch = 'prod',
    [int]$IntervalSeconds = 60,
    [switch]$ForceDeploy
)

$ErrorActionPreference = 'SilentlyContinue'

$OpsDir = Join-Path $Root 'ops'
$LogFile = Join-Path $OpsDir 'auto-deploy-prod.log'
$DeployScript = Join-Path $OpsDir 'deploy-prod.ps1'
$StateFile = Join-Path $OpsDir '.last-prod-seen'

function Write-Log($Message) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LogFile -Value "$ts  $Message" -Encoding utf8
}

New-Item -ItemType Directory -Force -Path $OpsDir | Out-Null
Write-Log "Auto deploy watcher started for origin/$Branch (pid $PID, interval ${IntervalSeconds}s)"

while ($true) {
    try {
        git -C $Root fetch origin $Branch --prune *> $null
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Fetch failed. Check Git credentials/network."
            Start-Sleep -Seconds $IntervalSeconds
            continue
        }

        $remoteSha = (git -C $Root rev-parse "origin/$Branch" 2>$null).Trim()
        $lastSeen = ''
        if (Test-Path $StateFile) {
            $lastSeen = (Get-Content -Path $StateFile -Raw).Trim()
        }

        if ($remoteSha -and $remoteSha -ne $lastSeen) {
            Write-Log "New origin/$Branch commit detected: $remoteSha"
            Set-Content -Path $StateFile -Value $remoteSha -Encoding ascii

            $args = @('-ExecutionPolicy', 'Bypass', '-NoProfile', '-File', $DeployScript, '-Root', $Root, '-Branch', $Branch)
            if ($ForceDeploy) {
                $args += '-Force'
            }

            $proc = Start-Process -FilePath 'powershell.exe' -ArgumentList $args -Wait -PassThru -WindowStyle Hidden
            Write-Log "Deploy process exited with code $($proc.ExitCode)"
        }
    }
    catch {
        Write-Log "ERROR: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds $IntervalSeconds
}
