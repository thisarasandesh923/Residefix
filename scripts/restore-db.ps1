#Requires -Version 5.1
<#
.SYNOPSIS
  Restores a backup made by backup-db.ps1.

.DESCRIPTION
  Adds the records from the backup. Records that already exist (same _id) are
  kept as they are and reported as "failed to restore" - that is expected.
  Nothing is deleted (no --drop), so a restore never wipes newer data.

.EXAMPLE
  .\scripts\restore-db.ps1 .\backups\residefix-20261110-090000.archive.gz
#>
param(
    [Parameter(Mandatory = $true)][string]$BackupFile
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Test-Path $BackupFile)) { throw "File not found: $BackupFile" }

$answer = Read-Host "Restore '$BackupFile' into the running ResideFix database? (yes/no)"
if ($answer -ne "yes") { Write-Host "Cancelled."; exit 0 }

$container = docker compose ps -q mongo
if (-not $container) { throw "MongoDB container is not running. Start with .\scripts\start-lab.ps1" }

docker cp $BackupFile "${container}:/tmp/restore.archive.gz"
docker compose exec -T mongo mongorestore --archive=/tmp/restore.archive.gz --gzip
$code = $LASTEXITCODE
docker compose exec -T mongo rm -f /tmp/restore.archive.gz
if ($code -ne 0) { throw "mongorestore failed." }
Write-Host "Restore finished." -ForegroundColor Green
