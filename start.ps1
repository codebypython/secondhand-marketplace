param(
    [int]$ApiPort = 8000,
    [int]$WebPort1 = 3000,
    [int]$WebPort2 = 3001
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# 1. Activate Python virtual environment and check dependencies
if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment (.venv)..." -ForegroundColor Yellow
    python -m venv .venv
}
& ".\.venv\Scripts\Activate.ps1"

Write-Host "Checking/Installing Backend packages..." -ForegroundColor Yellow
python -m pip install -q -e "backend[dev]"

# 2. Check/create configuration files
if (-not (Test-Path ".\backend\.env")) {
    Copy-Item ".\backend\.env.example" ".\backend\.env"
    Write-Host "Created backend/.env from template." -ForegroundColor Green
}
if (-not (Test-Path ".\frontend\.env.local") -and (Test-Path ".\frontend\.env.example")) {
    Copy-Item ".\frontend\.env.example" ".\frontend\.env.local"
    Write-Host "Created frontend/.env.local from template." -ForegroundColor Green
}

# 3. Detect local network IP (LAN IP) for mobile/LAN access
$localIp = "127.0.0.1"
try {
    $localIp = (Get-NetIPAddress | Where-Object { $_.AddressState -eq "Preferred" -and $_.AddressFamily -eq "IPv4" -and $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
} catch {}
if (-not $localIp) { $localIp = "127.0.0.1" }

# Update API URL in frontend config
if ($localIp -ne "127.0.0.1") {
    Write-Host "Detected LAN IP: $localIp" -ForegroundColor Green
    $envFile = "$PSScriptRoot\frontend\.env.local"
    if (Test-Path $envFile) {
        $content = Get-Content $envFile
        $content = $content -replace "NEXT_PUBLIC_API_URL=.*", "NEXT_PUBLIC_API_URL=http://$localIp`:$ApiPort/api/v1"
        $content | Set-Content $envFile
        Write-Host "Updated frontend/.env.local NEXT_PUBLIC_API_URL to http://$localIp`:$ApiPort/api/v1" -ForegroundColor Cyan
    }
}

# 4. Start Backend API Server
Write-Host "Starting Backend API Server on port $ApiPort..." -ForegroundColor Green
$backendCmd = "Set-Location `"$PSScriptRoot\backend`"; & `".\..\.venv\Scripts\Activate.ps1`"; uvicorn app.main:app --reload --host 0.0.0.0 --port $ApiPort"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCmd | Out-Null

# 5. Start Frontend Clients
Set-Location "$PSScriptRoot\frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Frontend npm packages..." -ForegroundColor Yellow
    npm install
}

# Start Client 1 (Port 3000)
Write-Host "Starting Frontend Client 1 (Buyer) on port $WebPort1..." -ForegroundColor Green
$frontendCmd1 = "Set-Location `"$PSScriptRoot\frontend`"; & `".\node_modules\.bin\next`" dev --webpack --hostname 0.0.0.0 --port $WebPort1"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCmd1 | Out-Null

# Start Client 2 (Port 3001)
Write-Host "Starting Frontend Client 2 (Seller) on port $WebPort2..." -ForegroundColor Green
$frontendCmd2 = "Set-Location `"$PSScriptRoot\frontend`"; & `".\node_modules\.bin\next`" dev --webpack --hostname 0.0.0.0 --port $WebPort2"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCmd2 | Out-Null

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "🎉 CLIENT-SERVER SYSTEM STARTED SUCCESSFULLY (LOCAL)!" -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "• Backend API:  http://localhost:$ApiPort/docs (or http://$localIp`:$ApiPort/docs)"
Write-Host "• Client 1 (Buyer):  http://localhost:$WebPort1 (or http://$localIp`:$WebPort1)"
Write-Host "• Client 2 (Seller): http://localhost:$WebPort2 (or http://$localIp`:$WebPort2)"
Write-Host "👉 LAN Access (for mobile debugging): http://$localIp`:$WebPort1" -ForegroundColor Green
Write-Host "👉 Run .\add-client.ps1 to open another client." -ForegroundColor Cyan
Write-Host "👉 Run .\stop.ps1 to stop all processes." -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Green