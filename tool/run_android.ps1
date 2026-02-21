param(
  [string]$DeviceId,
  [switch]$ListDevices,
  [string]$AndroidSdk,
  [string]$FlutterCmd
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here '..')
Set-Location $root

Write-Host "Project: $root"

# Resolve Flutter
if (-not $FlutterCmd) {
  $localFlutter = Resolve-Path (Join-Path $root '..\tools\flutter\bin\flutter.bat') -ErrorAction SilentlyContinue
  if ($localFlutter -and (Test-Path $localFlutter)) {
    $FlutterCmd = $localFlutter
    Write-Host "Flutter (local): $FlutterCmd"
  } else {
    $flutter = Get-Command flutter -ErrorAction SilentlyContinue
    if ($flutter) {
      $FlutterCmd = $flutter.Source
      Write-Host "Flutter (PATH): $FlutterCmd"
    }
  }
}

if (-not $FlutterCmd) {
  Write-Host "ERROR: Flutter not found." -ForegroundColor Red
  Write-Host "Fix: run .\tool\install_flutter.ps1 (uses tools\flutter_sdk.zip)" -ForegroundColor Yellow
  exit 1
}

& $FlutterCmd --version

# Ensure platform folders exist
& "$here\bootstrap.ps1" -FlutterCmd $FlutterCmd

# Try to locate Android SDK
$resolvedSdk = $null

if ($AndroidSdk) {
  $resolvedSdk = Resolve-Path $AndroidSdk -ErrorAction SilentlyContinue
}

if (-not $resolvedSdk -and $env:ANDROID_SDK_ROOT) {
  $resolvedSdk = Resolve-Path $env:ANDROID_SDK_ROOT -ErrorAction SilentlyContinue
}

if (-not $resolvedSdk -and $env:ANDROID_HOME) {
  $resolvedSdk = Resolve-Path $env:ANDROID_HOME -ErrorAction SilentlyContinue
}

if (-not $resolvedSdk) {
  $defaultSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  if (Test-Path $defaultSdk) {
    $resolvedSdk = Resolve-Path $defaultSdk -ErrorAction SilentlyContinue
  }
}

if ($resolvedSdk -and (Test-Path $resolvedSdk)) {
  Write-Host "Android SDK: $resolvedSdk"
  # Persist for Flutter so future runs work even without env vars.
  try {
    & $FlutterCmd config --android-sdk $resolvedSdk | Out-Host
  } catch {
    # Non-fatal; doctor will still pick up env vars.
  }
} else {
  Write-Host "ERROR: Android SDK not found, so Flutter can't run on your phone yet." -ForegroundColor Red
  Write-Host "Install Android Studio, then install SDK components (SDK Platform + Platform-Tools)." -ForegroundColor Yellow
  Write-Host "Typical SDK path on Windows:" -ForegroundColor Yellow
  Write-Host "  $env:LOCALAPPDATA\Android\Sdk" -ForegroundColor Yellow
  Write-Host "Then run:" -ForegroundColor Yellow
  Write-Host "  .\tool\run_android.ps1 -ListDevices" -ForegroundColor Yellow
  exit 1
}

Write-Host "\nAccept Android licenses (first time only):" -ForegroundColor DarkGray
Write-Host "  $FlutterCmd doctor --android-licenses" -ForegroundColor DarkGray

if ($ListDevices) {
  & $FlutterCmd devices
  exit 0
}

Write-Host "\nTip: Enable Developer Options + USB Debugging on your phone, then connect via USB." -ForegroundColor DarkGray
Write-Host "If you don't see your device, run: $FlutterCmd devices" -ForegroundColor DarkGray

& $FlutterCmd pub get

if ($DeviceId) {
  Write-Host "\nStarting on device: $DeviceId" -ForegroundColor Green
  & $FlutterCmd run -d $DeviceId
} else {
  Write-Host "\nStarting Flutter run (you may be prompted to choose a device)" -ForegroundColor Green
  & $FlutterCmd run
}
