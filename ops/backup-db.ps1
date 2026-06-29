param(
    [string]$Root = 'D:\Projects\order-nexora',
    [string]$BackupDir = 'D:\Projects\order-nexora\backups',
    [int]$KeepDays = 14
)

$ErrorActionPreference = 'Stop'

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$envFile = Join-Path $Root 'backend\.env'
$databaseUrl = ''
if (Test-Path $envFile) {
    $databaseUrl = (Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1) -replace '^DATABASE_URL=', ''
}

if (-not $databaseUrl) {
    $databaseUrl = 'sqlite:///./order_nexora.db'
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

if ($databaseUrl.StartsWith('sqlite')) {
    $relativePath = $databaseUrl -replace '^sqlite:///', ''
    $dbPath = if ([System.IO.Path]::IsPathRooted($relativePath)) {
        $relativePath
    } else {
        Join-Path (Join-Path $Root 'backend') $relativePath
    }

    if (-not (Test-Path $dbPath)) {
        throw "SQLite database not found: $dbPath"
    }

    $dest = Join-Path $BackupDir "order_nexora-sqlite-$stamp.db"
    Copy-Item -LiteralPath $dbPath -Destination $dest -Force
    Write-Output "Backup created: $dest"
} elseif ($databaseUrl.StartsWith('postgresql')) {
    $pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue)
    if (-not $pgDump -and (Test-Path 'D:\ProgramFiles\PostgreSQL\17\bin\pg_dump.exe')) {
        $pgDump = Get-Item 'D:\ProgramFiles\PostgreSQL\17\bin\pg_dump.exe'
    }
    if (-not $pgDump) {
        throw 'pg_dump not found. Install PostgreSQL client tools or run backup on the DB host.'
    }

    $dest = Join-Path $BackupDir "order_nexora-postgres-$stamp.dump"
    $pgDumpUrl = $databaseUrl -replace '^postgresql\+[^:]+://', 'postgresql://'
    & $pgDump.FullName --format=custom --file=$dest $pgDumpUrl
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }
    Write-Output "Backup created: $dest"
} else {
    throw "Unsupported DATABASE_URL for backup: $databaseUrl"
}

$cutoff = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem -Path $BackupDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    Remove-Item -Force
