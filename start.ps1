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
    # Prioritize the interface index that handles the default internet gateway routing
    $activeRoute = Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Select-Object -First 1
    if ($activeRoute) {
        $localIp = (Get-NetIPAddress -InterfaceIndex $activeRoute.InterfaceIndex -AddressFamily IPv4).IPAddress
    }
} catch {}

# Ensure the IP is not a loopback, link-local (169.254.x.x) or virtual network adapter IP
if ($localIp -eq "127.0.0.1" -or $localIp -like "169.254.*" -or $localIp -like "192.168.137.*" -or $localIp -like "192.168.56.*") {
    try {
        $localIp = (Get-NetIPAddress | Where-Object { 
            $_.AddressState -eq "Preferred" -and 
            $_.AddressFamily -eq "IPv4" -and 
            $_.IPAddress -notlike "127.*" -and 
            $_.IPAddress -notlike "169.254.*" -and 
            $_.IPAddress -notlike "192.168.137.*" -and 
            $_.IPAddress -notlike "192.168.56.*" 
        } | Select-Object -First 1).IPAddress
    } catch {}
}
if (-not $localIp) { $localIp = "127.0.0.1" }


# Update API URL in frontend config and backend CORS config
if ($localIp -ne "127.0.0.1") {
    Write-Host "Detected LAN IP: $localIp" -ForegroundColor Green
    $envFile = "$PSScriptRoot\frontend\.env.local"
    if (Test-Path $envFile) {
        $content = Get-Content $envFile
        $content = $content -replace "NEXT_PUBLIC_API_URL=.*", "NEXT_PUBLIC_API_URL=http://$localIp`:$ApiPort/api/v1"
        $content | Set-Content $envFile
        Write-Host "Updated frontend/.env.local NEXT_PUBLIC_API_URL to http://$localIp`:$ApiPort/api/v1" -ForegroundColor Cyan
    }
    $backendEnvFile = "$PSScriptRoot\backend\.env"
    if (Test-Path $backendEnvFile) {
        $bContent = Get-Content $backendEnvFile
        $bContent = $bContent -replace 'BACKEND_CORS_ORIGINS=.*', "BACKEND_CORS_ORIGINS=[`"http://localhost:3000`",`"http://127.0.0.1:3000`",`"http://$localIp`:3000`",`"http://$localIp`:3001`"]"
        $bContent | Set-Content $backendEnvFile
        Write-Host "Updated backend/.env BACKEND_CORS_ORIGINS to include LAN IP" -ForegroundColor Cyan
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

# 6. Auto-start and retrieve Ngrok tunnel if installed
$ngrokUrl = $null
$ngrokExe = $null

if (Test-Path "$PSScriptRoot\ngrok.exe") {
    $ngrokExe = "$PSScriptRoot\ngrok.exe"
} elseif (Get-Command ngrok -ErrorAction SilentlyContinue) {
    $ngrokExe = "ngrok"
}

if ($ngrokExe) {
    Write-Host "`n[Ngrok] Phát hiện Ngrok... Đang tự động mở cổng tunnel cho Frontend (cổng $WebPort1)..." -ForegroundColor Yellow
    
    # Start ngrok in background (silenced stdout logs, hidden window)
    $ngrokProcess = Start-Process $ngrokExe -ArgumentList "http $WebPort1 --log=stdout" -PassThru -WindowStyle Hidden -ErrorAction SilentlyContinue
    
    # Wait for ngrok API initialization (usually 2-3 seconds)
    Start-Sleep -Seconds 3
    
    try {
        # Fetch active tunnel config from ngrok agent local API (port 4040)
        $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2
        $ngrokUrl = $tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -ExpandProperty public_url -First 1
    } catch {
        # Fail silently if authtoken isn't configured yet
    }
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "🎉 CLIENT-SERVER SYSTEM STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "• Backend API:  http://localhost:$ApiPort/docs (or http://$localIp`:$ApiPort/docs)"
Write-Host "• Frontend URL: http://localhost:$WebPort1 (or http://$localIp`:$WebPort1)"
Write-Host "👉 LAN Access:  http://$localIp`:$WebPort1" -ForegroundColor Green
if ($ngrokUrl) {
    Write-Host "👉 Ngrok HTTPS: $ngrokUrl" -ForegroundColor Magenta
    Write-Host "   (Dùng liên kết HTTPS này trên iPhone/Điện thoại để truy cập Camera & Định vị GPS)" -ForegroundColor Gray
} else {
    Write-Host "👉 iOS/iPhone (Secure HTTPS): Chạy 'npx ngrok http $WebPort1' để lấy link HTTPS." -ForegroundColor Green
    Write-Host "   (Hoặc tải ngrok về máy và chạy 'ngrok config add-authtoken <TOKEN>' để hệ thống tự tạo link)" -ForegroundColor Gray
}
Write-Host "👉 Multi-user Demo: Mở 1 tab ẩn danh và 1 tab thường để giả lập Người mua & Người bán chat với nhau." -ForegroundColor Cyan
Write-Host "👉 Chạy .\stop.ps1 để dừng toàn bộ tiến trình hệ thống." -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Green