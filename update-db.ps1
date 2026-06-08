param(
    [switch]$Docker,      # Reset database inside Docker PostgreSQL instead of local SQLite
    [switch]$NoSeed       # Skip seeding mock data after reset
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$env:PYTHONIOENCODING = "utf-8"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🔄 DỌN DẸP & CẬP NHẬT DATABASE (SECONDHAND MARKETPLACE)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Ensure virtual env is present for python commands
if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment (.venv)..." -ForegroundColor Yellow
    python -m venv .venv
}
& ".\.venv\Scripts\Activate.ps1"
python -m pip install -q --upgrade pip setuptools wheel
python -m pip install -q -e "backend[dev]"

if ($Docker) {
    Write-Host "`n[1/3] Resetting PostgreSQL Database in Docker..." -ForegroundColor Yellow
    
    # Check if Docker is running
    $dockerRunning = $false
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        & docker ps > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dockerRunning = $true
        }
    }
    
    if (-not $dockerRunning) {
        Write-Error "Lỗi: Docker Desktop hoặc Docker Daemon chưa chạy. Vui lòng bật Docker để reset PostgreSQL DB."
        exit 1
    }
    
    # Stop postgres and delete its volume for a clean state
    Write-Host "Stopping and deleting database volumes..." -ForegroundColor Yellow
    docker compose down -v postgres
    docker compose up -d postgres
    
    Write-Host "Waiting for database container (PostgreSQL) to be ready..." -ForegroundColor Yellow
    $pgReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        $oldPreference = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        $res = docker compose exec -T postgres pg_isready -U app -d secondhand_marketplace 2>&1
        $exitCode = $LASTEXITCODE
        $ErrorActionPreference = $oldPreference
        
        if ($exitCode -eq 0) {
            $pgReady = $true
            break
        }
        Start-Sleep -Seconds 2
    }
    
    if ($pgReady) {
        Write-Host "`n[2/3] Running migrations inside Docker..." -ForegroundColor Yellow
        docker compose exec -T backend alembic upgrade head
        
        if (-not $NoSeed) {
            Write-Host "`n[3/3] Seeding fresh data inside Docker..." -ForegroundColor Yellow
            docker compose exec -T backend python seed_data.py
        }
    } else {
        Write-Error "PostgreSQL did not become ready in time."
        exit 1
    }
} else {
    Write-Host "`n[1/3] Resetting Local SQLite Database..." -ForegroundColor Yellow
    $dbFile = "$PSScriptRoot\backend\alembic-dev.db"
    
    if (Test-Path $dbFile) {
        Write-Host "Deleting old SQLite database file ($dbFile)..." -ForegroundColor Yellow
        Remove-Item $dbFile -Force
    }
    
    Write-Host "`n[2/3] Generating database schema & stamping migration head..." -ForegroundColor Yellow
    Push-Location backend
    try {
        python -c "from app.core.config import get_settings; from app.db.session import build_engine; from app.db.base import Base; Base.metadata.create_all(build_engine(get_settings().database_url))"
        python -m alembic stamp head
        
        if (-not $NoSeed) {
            Write-Host "`n[3/3] Seeding fresh mock data..." -ForegroundColor Yellow
            python seed_data.py
        }
    } finally {
        Pop-Location
    }
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "🎉 HOÀN TẤT RESET & CẬP NHẬT DATABASE THÀNH CÔNG!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
