param(
    [string]$Root = 'D:\Projects\order-nexora',
    [string]$Branch = 'prod',
    [switch]$InstallDevDependencies,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$OpsDir = Join-Path $Root 'ops'
$LogFile = Join-Path $OpsDir 'deploy-prod.log'
$LockFile = Join-Path $OpsDir 'deploy-prod.lock'

function Write-Log($Message) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LogFile -Value "$ts  $Message" -Encoding utf8
}

function Invoke-Logged($FilePath, [string[]]$Arguments, $WorkingDirectory) {
    Write-Log "RUN: $FilePath $($Arguments -join ' ')"
    $stdout = [System.IO.Path]::GetTempFileName()
    $stderr = [System.IO.Path]::GetTempFileName()
    try {
        $proc = Start-Process `
            -FilePath $FilePath `
            -ArgumentList $Arguments `
            -WorkingDirectory $WorkingDirectory `
            -Wait `
            -PassThru `
            -NoNewWindow `
            -RedirectStandardOutput $stdout `
            -RedirectStandardError $stderr

        foreach ($line in (Get-Content -Path $stdout -ErrorAction SilentlyContinue)) {
            Write-Log "  $line"
        }
        foreach ($line in (Get-Content -Path $stderr -ErrorAction SilentlyContinue)) {
            Write-Log "  $line"
        }

        if ($proc.ExitCode -ne 0) {
            throw "Command failed with exit code $($proc.ExitCode): $FilePath $($Arguments -join ' ')"
        }
    }
    finally {
        Remove-Item -Force $stdout, $stderr -ErrorAction SilentlyContinue
    }
}

function Test-DirtyWorktree {
    & git -C $Root diff --quiet --ignore-submodules -- *> $null
    $hasWorkingTreeChanges = $LASTEXITCODE -ne 0

    & git -C $Root diff --cached --quiet --ignore-submodules -- *> $null
    $hasStagedChanges = $LASTEXITCODE -ne 0

    $untracked = (& git -C $Root ls-files --others --exclude-standard | Select-Object -First 1 | Out-String).Trim()
    $hasUntrackedFiles = -not [string]::IsNullOrWhiteSpace($untracked)

    return $hasWorkingTreeChanges -or $hasStagedChanges -or $hasUntrackedFiles
}

function Stop-PortProcess([int]$Port) {
    $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        if ($conn.OwningProcess -and $conn.OwningProcess -ne $PID) {
            Write-Log "Stopping process $($conn.OwningProcess) on port $Port"
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

New-Item -ItemType Directory -Force -Path $OpsDir | Out-Null

if (Test-Path $LockFile) {
    $age = (Get-Date) - (Get-Item $LockFile).LastWriteTime
    if ($age.TotalMinutes -lt 30) {
        Write-Log "Deploy skipped: another deploy is running."
        exit 0
    }
    Write-Log "Removing stale deploy lock."
    Remove-Item -Force $LockFile
}

New-Item -ItemType File -Force -Path $LockFile | Out-Null

try {
    Write-Log "Deploy started for origin/$Branch"

    Invoke-Logged 'git' @('-C', $Root, 'fetch', 'origin', $Branch, '--prune') $Root

    if ((Test-DirtyWorktree) -and -not $Force) {
        Write-Log "Deploy stopped: worktree has local changes. Commit/stash them, or run with -Force on a clean server clone."
        exit 2
    }

    if ($Force) {
        Write-Log "Force enabled: resetting tracked files to origin/$Branch"
    }

    Invoke-Logged 'git' @('-C', $Root, 'checkout', '-B', $Branch, "origin/$Branch") $Root
    Invoke-Logged 'git' @('-C', $Root, 'reset', '--hard', "origin/$Branch") $Root

    $backend = Join-Path $Root 'backend'
    $venvPython = Join-Path $backend '.venv\Scripts\python.exe'

    if (-not (Test-Path $venvPython)) {
        Invoke-Logged 'python' @('-m', 'venv', '.venv') $backend
    }

    Invoke-Logged $venvPython @('-m', 'pip', 'install', '--upgrade', 'pip') $backend
    Invoke-Logged $venvPython @('-m', 'pip', 'install', '-r', 'requirements.txt') $backend
    if ($InstallDevDependencies -and (Test-Path (Join-Path $backend 'requirements-dev.txt'))) {
        Invoke-Logged $venvPython @('-m', 'pip', 'install', '-r', 'requirements-dev.txt') $backend
    }

    $frontend = Join-Path $Root 'frontend'
    if (Test-Path (Join-Path $frontend 'package.json')) {
        $npm = 'npm.cmd'
        if (Test-Path (Join-Path $frontend 'package-lock.json')) {
            Invoke-Logged $npm @('ci') $frontend
        } else {
            Invoke-Logged $npm @('install') $frontend
        }
        Invoke-Logged $npm @('run', 'build') $frontend
    }

    Stop-PortProcess 8000

    $watchdogLauncher = Join-Path $OpsDir 'start-hidden.vbs'
    if (Test-Path $watchdogLauncher) {
        Write-Log "Starting watchdog launcher."
        Start-Process -FilePath 'wscript.exe' -ArgumentList "`"$watchdogLauncher`"" -WindowStyle Hidden
    }

    $deployedSha = (& git -C $Root rev-parse HEAD).Trim()
    Set-Content -Path (Join-Path $OpsDir '.last-prod-deployed') -Value $deployedSha -Encoding ascii
    Write-Log "Deploy finished at $deployedSha"
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    exit 1
}
finally {
    Remove-Item -Force $LockFile -ErrorAction SilentlyContinue
}
