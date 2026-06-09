﻿param(
    [switch]$NoTest,     # Skip tests and build checks
    [switch]$NoPush      # Perform commit but skip git push
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 CHUẨN HÓA & ĐĂNG MÃ NGUỒN LÊN GITHUB (COMMIT CHUYÊN NGHIỆP)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Show git status
Write-Host "Current Git Status:" -ForegroundColor Yellow
git status
Write-Host ""

# Ask if they want to proceed
$choices = [System.Management.Automation.Host.ChoiceDescription[]]@(
    New-Object System.Management.Automation.Host.ChoiceDescription "&Yes", "Proceed with commit"
    New-Object System.Management.Automation.Host.ChoiceDescription "&No", "Abort"
)
$decision = $host.UI.PromptForChoice("Commit", "Do you want to stage and commit all changes?", $choices, 0)
if ($decision -ne 0) {
    Write-Host "Aborted." -ForegroundColor Red
    exit 0
}

# Run tests and compilation checks
if (-not $NoTest) {
    Write-Host "`n[1/4] Running backend unit tests (Pytest)..." -ForegroundColor Yellow
    if (Test-Path ".venv") {
        & ".\.venv\Scripts\Activate.ps1"
        Push-Location backend
        try {
            $testResult = python -m pytest
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Lỗi: Một số unit test Backend bị hỏng! Vui lòng sửa lỗi trước khi commit."
                exit 1
            }
        } finally {
            Pop-Location
        }
        Write-Host "✅ Backend tests passed!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Warning: .venv not found. Skipping backend tests." -ForegroundColor Yellow
    }

    Write-Host "`n[2/4] Running frontend compilation check (Next.js build)..." -ForegroundColor Yellow
    Push-Location frontend
    try {
        if (-not (Test-Path "node_modules")) {
            npm install
        }
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Lỗi: Build Frontend thất bại (TypeScript/Linting error)! Vui lòng sửa lỗi trước khi commit."
            exit 1
        }
    } finally {
        Pop-Location
    }
    Write-Host "✅ Frontend compilation check passed!" -ForegroundColor Green
} else {
    Write-Host "`n[1/4] Skipping tests and build checks (-NoTest is active)." -ForegroundColor Yellow
}

# Conventional Commits Prompt
Write-Host "`n[3/4] Conventional Commits - Chọn loại thay đổi của bạn:" -ForegroundColor Yellow
Write-Host "  1. feat:     Tính năng mới (A new feature)"
Write-Host "  2. fix:      Sửa lỗi (A bug fix)"
Write-Host "  3. docs:     Thay đổi tài liệu (Documentation only changes)"
Write-Host "  4. refactor: Tái cấu trúc mã nguồn (A code change that neither fixes a bug nor adds a feature)"
Write-Host "  5. style:    Định dạng code (Formatting, missing semi-colons, etc.)"
Write-Host "  6. test:     Viết thêm hoặc cập nhật tests"
Write-Host "  7. chore:    Các thay đổi phụ trợ khác (Build tools, package updates, etc.)"

$typeNum = Read-Host "Chọn số (1-7)"
$type = switch ($typeNum) {
    "1" { "feat" }
    "2" { "fix" }
    "3" { "docs" }
    "4" { "refactor" }
    "5" { "style" }
    "6" { "test" }
    "7" { "chore" }
    default { "" }
}

if (-not $type) {
    Write-Error "Lỗi: Lựa chọn không hợp lệ."
    exit 1
}

$scope = Read-Host "Nhập phạm vi thay đổi (Scope) [Bỏ qua nếu không có, VD: auth, wishlist]"
$msg = Read-Host "Nhập mô tả thay đổi (Commit message) *"

if (-not $msg.Trim()) {
    Write-Error "Lỗi: Mô tả thay đổi không được để trống."
    exit 1
}

# Construct commit message: "type(scope): message" or "type: message"
$commitMsg = $type
if ($scope.Trim()) {
    $commitMsg += "(" + $scope.Trim() + ")"
}
$commitMsg += ": " + $msg.Trim()

Write-Host "`nStaging and committing..." -ForegroundColor Yellow
git add .
git commit -m $commitMsg
Write-Host "✅ Committed successfully: '$commitMsg'" -ForegroundColor Green

# Git push
if (-not $NoPush) {
    Write-Host "`n[4/4] Pushing code to GitHub..." -ForegroundColor Yellow
    git push
    Write-Host "🎉 ĐÃ ĐĂNG MÃ NGUỒN LÊN GITHUB THÀNH CÔNG!" -ForegroundColor Green
} else {
    Write-Host "`n[4/4] Skipping git push (-NoPush active)." -ForegroundColor Yellow
}
