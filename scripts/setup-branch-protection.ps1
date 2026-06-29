# Áp dụng branch protection cho order-nexora theo Gitflow.
# Yêu cầu: đã chạy `gh auth login` với tài khoản có quyền admin trên repo.
#
# Luật áp cho prod & staging:
#   - Chặn push trực tiếp (chỉ qua PR)
#   - Bắt buộc 1 approval review, tự dismiss approval cũ khi có commit mới
#   - Bắt buộc pass CI ("Lint Test Build") trước khi merge
#   - enforce_admins = false  -> admin (bạn) có thể bỏ qua khi cần
#
# Cách dùng:  powershell -ExecutionPolicy Bypass -File .\scripts\setup-branch-protection.ps1

$ErrorActionPreference = "Stop"

$repo = "NguyenLeHai080/order-nexora"
$ghCandidates = @(
  "$env:ProgramFiles\GitHub CLI\gh.exe",
  "${env:ProgramFiles(x86)}\GitHub CLI\gh.exe",
  "$env:LOCALAPPDATA\Programs\GitHub CLI\gh.exe",
  "gh"
)
$gh = $ghCandidates | Where-Object { $_ -eq "gh" -or (Test-Path $_) } | Select-Object -First 1
if (-not $gh) { throw "Không tìm thấy gh CLI. Cài bằng: winget install GitHub.cli" }

# Đảm bảo đã đăng nhập
& $gh auth status *> $null
if ($LASTEXITCODE -ne 0) { throw "Chưa đăng nhập gh. Chạy: gh auth login" }

# Payload protection dùng chung
$payload = @{
  required_status_checks = @{
    strict   = $true
    contexts = @("Lint Test Build")
  }
  enforce_admins = $false
  required_pull_request_reviews = @{
    required_approving_review_count = 1
    dismiss_stale_reviews           = $true
  }
  restrictions = $null
} | ConvertTo-Json -Depth 6

# Ghi JSON ra file tạm bằng UTF-8 (không BOM) để tránh PowerShell mã hóa hỏng khi pipe.
$tmp = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tmp, $payload, (New-Object System.Text.UTF8Encoding($false)))

try {
  foreach ($branch in @("prod", "staging")) {
    Write-Host "Áp dụng protection cho '$branch'..." -ForegroundColor Cyan
    & $gh api -X PUT "repos/$repo/branches/$branch/protection" `
      -H "Accept: application/vnd.github+json" --input $tmp
    if ($LASTEXITCODE -eq 0) {
      Write-Host "  OK: $branch đã được bảo vệ." -ForegroundColor Green
    } else {
      Write-Host "  LỖI khi bảo vệ $branch." -ForegroundColor Red
    }
  }
}
finally {
  Remove-Item $tmp -ErrorAction SilentlyContinue
}

Write-Host "`nHoàn tất. Kiểm tra tại: https://github.com/$repo/settings/branches" -ForegroundColor Yellow
