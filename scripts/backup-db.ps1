#Requires -Version 5.1
<#
.SYNOPSIS
  Saves a MongoDB backup of ResideFix to .\backups\residefix-<date>.archive.gz
#>
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

New-Item -ItemType Directory -Force "backups" | Out-Null
$file = "residefix-{0}.archive.gz" -f (Get-Date -Format "yyyyMMdd-HHmmss")

docker compose exec -T mongo mongodump --db residefix --archive=/tmp/backup.archive.gz --gzip
if ($LASTEXITCODE -ne 0) { throw "mongodump failed. Is the stack running? (docker compose ps)" }
$container = docker compose ps -q mongo
docker cp "${container}:/tmp/backup.archive.gz" "backups\$file"
docker compose exec -T mongo rm -f /tmp/backup.archive.gz

Write-Host "Backup saved to backups\$file" -ForegroundColor Green
