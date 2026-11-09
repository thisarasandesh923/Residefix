#Requires -Version 5.1
<#
.SYNOPSIS
  Checks that the ResideFix containers are healthy and the website/API answer.
#>
$ErrorActionPreference = "Continue"
Set-Location (Split-Path -Parent $PSScriptRoot)

$failed = $false
function Check($name, [scriptblock]$test) {
    try {
        $result = & $test
        Write-Host ("[ OK ] {0} {1}" -f $name, $result) -ForegroundColor Green
    } catch {
        Write-Host ("[FAIL] {0}: {1}" -f $name, $_.Exception.Message) -ForegroundColor Red
        $script:failed = $true
    }
}

Write-Host "Containers:"
docker compose ps
Write-Host ""

$port = (docker compose port frontend 8080) -replace ".*:", ""
if (-not $port) {
    Write-Host "[FAIL] The frontend container is not running. Start with .\scripts\start-lab.ps1" -ForegroundColor Red
    exit 1
}

$ips = @("localhost") + (Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
    ForEach-Object { $_.IPv4Address.IPAddress })

foreach ($ip in $ips) {
    $base = "http://${ip}:$port"
    Check "Website      $base/" { (Invoke-WebRequest "$base/" -UseBasicParsing -TimeoutSec 5).StatusCode }
    Check "API + MongoDB $base/api/health/ready" {
        (Invoke-RestMethod "$base/api/health/ready" -TimeoutSec 5).database
    }
}

Write-Host ""
Write-Host "Database volume:"
docker compose volumes

if ($failed) {
    Write-Host "`nSome checks failed. See: docker compose logs --tail 50 backend" -ForegroundColor Yellow
    exit 1
}
Write-Host "`nAll checks passed. Other lab PCs should open one of the http://<ip>:$port addresses above." -ForegroundColor Green
Write-Host "(This script runs on the host, so it cannot prove the firewall allows other PCs; test from a second PC.)"
