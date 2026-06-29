param(
    [string]$Root = 'D:\Projects\order-nexora',
    [string]$TaskName = 'OrderNexoraDbBackup',
    [string]$At = '03:00'
)

$ErrorActionPreference = 'Stop'

$script = Join-Path $Root 'ops\backup-db.ps1'
if (-not (Test-Path $script)) {
    throw "Backup script not found: $script"
}

$time = [DateTime]::ParseExact($At, 'HH:mm', $null)
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -NoProfile -File `"$script`" -Root `"$Root`""
$trigger = New-ScheduledTaskTrigger -Daily -At $time
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description 'Daily Order Nexora database backup.' -Force | Out-Null
Write-Output "Installed scheduled task: $TaskName at $At"
