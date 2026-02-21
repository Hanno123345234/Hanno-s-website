param(
  [int]$Port = 8081
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here '..')
Set-Location $root

$flutterBat = Resolve-Path (Join-Path $root '..\tools\flutter\bin\flutter.bat') -ErrorAction SilentlyContinue
if (-not $flutterBat) {
  Write-Host "ERROR: Flutter not found. Run .\tool\install_flutter.ps1 first." -ForegroundColor Red
  exit 1
}

Write-Host "Building web (release)..." -ForegroundColor Cyan
& $flutterBat build web --release

$dir = Join-Path $root 'build\web'
if (-not (Test-Path $dir)) {
  Write-Host "ERROR: build/web not found." -ForegroundColor Red
  exit 1
}

Write-Host "\nServing build/web on 0.0.0.0:$Port" -ForegroundColor Cyan
Write-Host "Open on iPhone (same Wi-Fi): http://<PC-IP>:$Port" -ForegroundColor Yellow
Write-Host "(Use the IP printed by .\\tool\\run_web.ps1)" -ForegroundColor Yellow

python -m http.server $Port --bind 0.0.0.0 --directory $dir
