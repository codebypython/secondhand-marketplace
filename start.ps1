param(
    [int]$ApiPort = 8000,
    [int]$WebPort1 = 3000,
    [int]$WebPort2 = 3001
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location $PSScriptRoot
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

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

# Start Frontend Client (Port 3000)
Write-Host "Starting Frontend Client on port $WebPort1..." -ForegroundColor Green
$frontendCmd1 = "Set-Location `"$PSScriptRoot\frontend`"; `$env:PORT=$WebPort1; & `".\node_modules\.bin\next`" dev --webpack --hostname 0.0.0.0 --port $WebPort1"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCmd1 | Out-Null

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "🎉 CLIENT-SERVER SYSTEM STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "• Backend API:  http://localhost:$ApiPort/docs (or http://$localIp`:$ApiPort/docs)"
Write-Host "• Frontend URL: http://localhost:$WebPort1 (or http://$localIp`:$WebPort1)"
Write-Host "👉 LAN Access:  http://$localIp`:$WebPort1" -ForegroundColor Green
Write-Host "👉 iOS/iPhone (Secure HTTPS): Run 'npx ngrok http $WebPort1' to get HTTPS URL." -ForegroundColor Green
Write-Host "👉 Multi-user Demo: Open one normal tab and one Incognito (Private) tab pointing to the Frontend URL." -ForegroundColor Cyan
Write-Host "👉 Run .\stop.ps1 to stop all backend and frontend processes." -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Green