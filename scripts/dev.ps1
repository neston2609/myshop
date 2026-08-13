[CmdletBinding()]
param(
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path ".env")) {
    throw "Missing .env. Copy the protected production environment or .env.example first."
}

if (-not (Test-Path "node_modules")) {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
}

npm run prisma:generate
if ($LASTEXITCODE -ne 0) { throw "Prisma Client generation failed." }

Write-Host "Starting Japan Toy Shop at http://localhost:$Port"
Write-Warning "Development is connected to the production database. Avoid seed and destructive migration commands."
npx next dev -p $Port

