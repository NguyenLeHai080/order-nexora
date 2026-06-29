param(
    [string]$Root = 'D:\Projects\order-nexora',
    [int]$MaxSizeMb = 10,
    [int]$KeepDays = 14
)

$ErrorActionPreference = 'Stop'

$OpsDir = Join-Path $Root 'ops'
$ArchiveDir = Join-Path $OpsDir 'logs-archive'
New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null

$maxBytes = $MaxSizeMb * 1MB
$now = Get-Date

Get-ChildItem -Path $OpsDir -Filter '*.log' -File -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.Length -lt $maxBytes) {
        return
    }

    $stamp = $now.ToString('yyyyMMdd-HHmmss')
    $archive = Join-Path $ArchiveDir "$($_.BaseName)-$stamp.log"
    Move-Item -LiteralPath $_.FullName -Destination $archive -Force
    New-Item -ItemType File -Path $_.FullName -Force | Out-Null
}

Get-ChildItem -Path $ArchiveDir -Filter '*.log' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $now.AddDays(-$KeepDays) } |
    Remove-Item -Force
