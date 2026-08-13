[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    throw "OpenSSH client is required."
}

git fetch --prune origin main
if ($LASTEXITCODE -ne 0) { throw "Could not fetch origin/main." }

$targetSha = (git rev-parse origin/main).Trim()
if ($LASTEXITCODE -ne 0 -or -not $targetSha) { throw "Could not resolve origin/main." }

$branch = (git branch --show-current).Trim()
Write-Host "Deploying origin/main ($targetSha) to production."
if ($branch -ne "main") {
    Write-Warning "Current local branch is '$branch'; deployment still uses origin/main only."
}

$deployScript = Join-Path $PSScriptRoot "deploy-production.sh"
Get-Content -Raw $deployScript | ssh project-planning-prod "sed 's/\r$//' | bash -s -- '$targetSha'"
if ($LASTEXITCODE -ne 0) { throw "Production deployment failed." }
