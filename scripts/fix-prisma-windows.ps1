# Fix Prisma CLI on Windows when index.js is missing/blocked by antivirus
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$prismaBuild = Join-Path $projectRoot "node_modules\prisma\build"
$indexPath = Join-Path $prismaBuild "index.js"
$packDir = Join-Path $env:TEMP "ph-prisma-pack"

Write-Host "PH Health Care - Prisma Windows Fix" -ForegroundColor Cyan
Write-Host "Project: $projectRoot"

if (-not (Test-Path (Join-Path $projectRoot "node_modules\prisma"))) {
    Write-Host "Run 'npm install' first." -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $packDir | Out-Null
Set-Location $packDir

if (-not (Test-Path "prisma-7.5.0.tgz")) {
    Write-Host "Downloading prisma@7.5.0..."
    npm pack prisma@7.5.0 --silent
}

tar -xf prisma-7.5.0.tgz
New-Item -ItemType Directory -Force -Path $prismaBuild | Out-Null
Copy-Item "package\build\index.js" $indexPath -Force

try {
    node -e "require('fs').readFileSync(process.argv[1]); console.log('index.js readable OK')" $indexPath
} catch {
    Write-Host ""
    Write-Host "BLOCKED: Windows antivirus is blocking prisma index.js" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix:" -ForegroundColor Yellow
    Write-Host "1. Windows Security -> Virus & threat protection -> Manage settings"
    Write-Host "2. Exclusions -> Add exclusion -> Folder:"
    Write-Host "   $projectRoot\node_modules"
    Write-Host "3. Run this script again: npm run generate:fix"
    Write-Host ""
    exit 1
}

Set-Location $projectRoot
Write-Host "Running prisma generate..."
node ./node_modules/prisma/build/index.js generate
Write-Host "Done!" -ForegroundColor Green
