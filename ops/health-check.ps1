param(
    [string]$Url = 'http://localhost:8000/api/health',
    [int]$TimeoutSec = 10
)

$ErrorActionPreference = 'Stop'

$response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec
if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
    throw "Health check failed with HTTP $($response.StatusCode)"
}

Write-Output $response.Content
