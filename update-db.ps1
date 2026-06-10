﻿param(
    [switch]$NoSeed       # Skip seeding mock data after reset
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location $PSScriptRoot
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🔄 DỌN DẸP & RESET DATABASE (LOCAL DATABASE)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Activate Python virtual environment
if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment (.venv)..." -ForegroundColor Yellow
    python -m venv .venv
}
& ".\.venv\Scripts\Activate.ps1"

Write-Host "Checking/Installing Backend packages..." -ForegroundColor Yellow
python -m pip install -q -e "backend[dev]"

# Ensure .env exists
if (-not (Test-Path ".\backend\.env")) {
    Copy-Item ".\backend\.env.example" ".\backend\.env"
}

# 2. Reset database and run migrations locally
Push-Location backend
try {
    Write-Host "`n[1/3] Resetting database tables..." -ForegroundColor Yellow
    python scripts/reset_db.py
    
    Write-Host "`n[2/3] Stamping database migration to HEAD..." -ForegroundColor Yellow
    python -m alembic stamp head
    
    if (-not $NoSeed) {
        Write-Host "`n[3/3] Seeding fresh mock data..." -ForegroundColor Yellow
        python seed_data.py
    }
} finally {
    Pop-Location
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "🎉 HOÀN TẤT RESET & CẬP NHẬT DATABASE THÀNH CÔNG!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
