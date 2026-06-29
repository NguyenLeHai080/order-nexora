param(
    [string]$Root = 'D:\Projects\order-nexora',
    [int]$IntervalSeconds = 60,
    [switch]$ForceDeploy
)

$ErrorActionPreference = 'Stop'

$Script = Join-Path $Root 'ops\auto-deploy-prod.ps1'
if (-not (Test-Path $Script)) {
    throw "Auto deploy script not found: $Script"
}

$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'OrderNexoraAutoDeployProd.lnk'

$args = "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$Script`" -Root `"$Root`" -Branch prod -IntervalSeconds $IntervalSeconds"
if ($ForceDeploy) {
    $args += ' -ForceDeploy'
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'powershell.exe'
$shortcut.Arguments = $args
$shortcut.WorkingDirectory = $Root
$shortcut.WindowStyle = 7
$shortcut.Description = 'Watch origin/prod and deploy Order Nexora automatically.'
$shortcut.Save()

Write-Output "Installed startup shortcut: $shortcutPath"
Write-Output "It will run when this Windows user logs in."
