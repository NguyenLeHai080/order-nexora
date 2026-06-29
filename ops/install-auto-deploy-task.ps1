param(
    [string]$Root = 'D:\Projects\order-nexora',
    [string]$TaskName = 'OrderNexoraAutoDeployProd',
    [int]$IntervalSeconds = 60,
    [switch]$StartNow,
    [switch]$ForceDeploy
)

$ErrorActionPreference = 'Stop'

$Script = Join-Path $Root 'ops\auto-deploy-prod.ps1'
if (-not (Test-Path $Script)) {
    throw "Auto deploy script not found: $Script"
}

$args = "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$Script`" -Root `"$Root`" -Branch prod -IntervalSeconds $IntervalSeconds"
if ($ForceDeploy) {
    $args += ' -ForceDeploy'
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $args
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Days 365) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description 'Watch origin/prod and deploy Order Nexora automatically on this Windows server.' `
    -Force | Out-Null

Write-Output "Installed scheduled task: $TaskName"
Write-Output "Watcher script: $Script"

if ($StartNow) {
    Start-ScheduledTask -TaskName $TaskName
    Write-Output "Started scheduled task: $TaskName"
}
