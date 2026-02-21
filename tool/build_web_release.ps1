param(
  [ValidateSet('html', 'skia')]
  [string]$Renderer = 'html',
  [string]$BaseHref = '/',
  [switch]$NoPwa
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here '..')
Set-Location $root

$flutterCmd = Resolve-Path (Join-Path $root '..\tools\flutter\bin\flutter.bat') -ErrorAction SilentlyContinue
if (-not $flutterCmd -or -not (Test-Path $flutterCmd)) {
  $flutter = Get-Command flutter -ErrorAction SilentlyContinue
  if ($flutter) { $flutterCmd = $flutter.Source }
}
if (-not $flutterCmd) {
  Write-Host 'ERROR: Flutter not found. Run .\tool\install_flutter.ps1 first.' -ForegroundColor Red
  exit 1
}

& $flutterCmd config --enable-web | Out-Host
& "$here\bootstrap.ps1" -FlutterCmd $flutterCmd
& $flutterCmd pub get

$defines = @()
if ($Renderer -eq 'html') {
  $defines += '--dart-define=FLUTTER_WEB_USE_SKIA=false'
} else {
  $defines += '--dart-define=FLUTTER_WEB_USE_SKIA=true'
}

$args = @('build', 'web', '--release', "--base-href=$BaseHref") + $defines
if ($NoPwa) {
  # Flutter 3.38 supports build web --pwa-strategy
  $args += @('--pwa-strategy', 'none')
}

Write-Host "Building web release (Renderer=$Renderer, BaseHref=$BaseHref, NoPwa=$NoPwa) ..." -ForegroundColor Cyan
& $flutterCmd @args

Write-Host "\nOK: Output is in $root\build\web" -ForegroundColor Green
