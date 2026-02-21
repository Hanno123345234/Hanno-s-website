param(
  [ValidateSet('debug', 'profile', 'release')]
  [string]$BuildMode = 'release',
  [switch]$SplitPerAbi,
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

# Ensure platform folders exist
& "$here\bootstrap.ps1" -FlutterCmd $FlutterCmd

# Try to locate Android SDK (same logic as run_android.ps1)
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
  try {
    & $FlutterCmd config --android-sdk $resolvedSdk | Out-Host
  } catch {
  }
} else {
  Write-Host "ERROR: Android SDK not found. Install Android Studio/SDK first." -ForegroundColor Red
  exit 1
}

& $FlutterCmd pub get

$buildArgs = @('build', 'apk')
if ($BuildMode -eq 'release') { $buildArgs += '--release' }
elseif ($BuildMode -eq 'profile') { $buildArgs += '--profile' }
else { $buildArgs += '--debug' }

if ($SplitPerAbi) {
  $buildArgs += '--split-per-abi'
}

Write-Host "\nBuilding APK ($BuildMode)..." -ForegroundColor Green
& $FlutterCmd @buildArgs

Write-Host "\nAPK output is typically here:" -ForegroundColor DarkGray
Write-Host "  build\app\outputs\flutter-apk\" -ForegroundColor DarkGray
