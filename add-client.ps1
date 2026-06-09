param(
    [int]$Port = 0
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if ($Port -eq 0) {
    # Find next free port starting from 3002
    $Port = 3002
    while (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue) {
        $Port++
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 MỞ THÊM 1 FRONTEND CLIENT MỚI (CỔNG $Port)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$frontendCmd = "Set-Location `"$PSScriptRoot\frontend`"; & `".\node_modules\.bin\next`" dev --webpack --hostname 0.0.0.0 --port $Port"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCmd | Out-Null

Write-Host "Client mới đang chạy tại: http://localhost:$Port" -ForegroundColor Green
