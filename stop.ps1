param([switch]$KeepDocker)

$ErrorActionPreference = "SilentlyContinue"
Set-Location $PSScriptRoot

Get-CimInstance Win32_Process | Where-Object {
    $cmd = [string]$_.CommandLine
    ($cmd -like "*secondhand-marketplace*") -and (
        $cmd -match "uvicorn app\.main:app" -or
        $cmd -match "next dev" -or
        $cmd -match "npm run dev"
    )
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
}

if (-not $KeepDocker) {
    docker compose down
}
