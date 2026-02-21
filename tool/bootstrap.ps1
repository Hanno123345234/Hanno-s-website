param(
  [string]$FlutterCmd
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here '..')
Set-Location $root

if (-not (Test-Path (Join-Path $root 'pubspec.yaml'))) {
  throw "pubspec.yaml not found in $root"
}

# If this folder wasn’t created by `flutter create`, generate platform folders.
$needsCreate = -not (Test-Path (Join-Path $root 'android')) -or -not (Test-Path (Join-Path $root 'ios'))

if ($needsCreate) {
  Write-Host 'Generating Flutter platform folders (flutter create .)'
  if ($FlutterCmd) {
    & $FlutterCmd create .
  } else {
    flutter create .
  }
} else {
  Write-Host 'Platform folders already exist.'
}

Write-Host 'Done.'
