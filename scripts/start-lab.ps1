#Requires -Version 5.1
<#
.SYNOPSIS
  Builds and starts ResideFix with Docker Compose, then prints the LAN address.

.DESCRIPTION
  Safe to run again at any time (also after `git pull` to upgrade).
  It never deletes database data.

.EXAMPLE
  .\scripts\start-lab.ps1
  .\scripts\start-lab.ps1 -Port 8081
#>
param(
    [int]$Port = 0
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

# 1. Docker must be installed and running
Write-Step "Checking Docker"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
}
docker info --format "{{.ServerVersion}}" *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop is not running. Start it, wait for 'Engine running', then run this script again."
}
Write-Host "Docker is running."

# 2. Optional .env (create from the example the first time, never overwrite)
if (-not (Test-Path ".env")) {
    Write-Step "Creating .env from .env.example (first run)"
    Copy-Item ".env.example" ".env"
}
if ($Port -gt 0) {
    $env:RESIDEFIX_PORT = "$Port"
}

# 3. Build and start
Write-Step "Building and starting containers (first run downloads images; this can take several minutes)"
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { throw "docker compose failed. See the messages above." }

# 4. Wait for all services to report healthy
Write-Step "Waiting for the services to become healthy"
$deadline = (Get-Date).AddMinutes(3)
do {
    Start-Sleep -Seconds 3
    $states = docker compose ps --format "{{.Service}}={{.Health}}"
    $healthy = @($states | Where-Object { $_ -match "=healthy$" }).Count
    Write-Host "  $healthy/3 healthy"
} while ($healthy -lt 3 -and (Get-Date) -lt $deadline)

if ($healthy -lt 3) {
    docker compose ps
    throw "Not all services became healthy. Check: docker compose logs backend"
}

# 5. Print the addresses
$publishedPort = (docker compose port frontend 8080) -replace ".*:", ""
$ips = Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
    ForEach-Object { $_.IPv4Address.IPAddress }

Write-Host ""
Write-Host "ResideFix is running." -ForegroundColor Green
Write-Host "  On this computer:      http://localhost:$publishedPort"
foreach ($ip in $ips) {
    Write-Host "  From other lab PCs:    http://${ip}:$publishedPort" -ForegroundColor Green
}
Write-Host ""
Write-Host "If other PCs cannot connect, allow the port in Windows Firewall (run PowerShell as Administrator):"
Write-Host "  New-NetFirewallRule -DisplayName 'ResideFix $publishedPort' -Direction Inbound -Protocol TCP -LocalPort $publishedPort -Action Allow -Profile Domain,Private"
