param(
    [switch]$NoDocker,
    [switch]$NoMigrate,
    [switch]$NoFrontend,
    [int]$ApiPort = 8000,
    [int]$WebPort = 3000
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
& ".\.venv\Scripts\Activate.ps1"

python -m pip install -e "backend[dev]"

if (-not (Test-Path ".\backend\.env")) {
    Copy-Item ".\backend\.env.example" ".\backend\.env"
}
if (-not (Test-Path ".\frontend\.env.local") -and (Test-Path ".\frontend\.env.example")) {
    Copy-Item ".\frontend\.env.example" ".\frontend\.env.local"
}

if (-not $NoDocker) {
    docker compose up -d postgres
    Write-Host "Waiting for Postgres to accept connections..."
    $pgReady = $false
    for ($i = 0; $i -lt 45; $i++) {
        docker exec secondhand-marketplace-postgres pg_isready -U app -d secondhand_marketplace 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $pgReady = $true
            break
        }
        Start-Sleep -Seconds 2
    }
    if (-not $pgReady) {
        throw "Postgres did not become ready in time. Check: docker compose logs postgres"
    }
}

if (-not $NoMigrate) {
    # Alembic script_location is relative to cwd; must run from backend/
    Push-Location "$PSScriptRoot\backend"
    try {
        python -m alembic upgrade head
    } finally {
        Pop-Location
    }
}

$backendCmd = "Set-Location `"$PSScriptRoot`"; & `".\.venv\Scripts\Activate.ps1`"; uvicorn app.main:app --reload --app-dir backend --port $ApiPort"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCmd | Out-Null

if (-not $NoFrontend) {
    Set-Location "$PSScriptRoot\frontend"
    if (-not (Test-Path "node_modules")) {
        npm install
    }
    $frontendCmd = "Set-Location `"$PSScriptRoot\frontend`"; npm run dev -- -p $WebPort"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCmd | Out-Null
}

Write-Host "Backend:  http://127.0.0.1:$ApiPort/docs"
if (-not $NoFrontend) {
    Write-Host "Frontend: http://127.0.0.1:$WebPort"
}