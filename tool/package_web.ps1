param(
  [string]$OutFile = 'web_build.zip'
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here '..')
$buildDir = Join-Path $root 'build\web'

if (-not (Test-Path $buildDir)) {
  Write-Host "ERROR: $buildDir not found. Run .\tool\build_web_release.ps1 first." -ForegroundColor Red
  exit 1
}

$dest = Join-Path $root $OutFile
if (Test-Path $dest) { Remove-Item -Force $dest }

Write-Host "Packaging $buildDir -> $dest" -ForegroundColor Cyan
Compress-Archive -Path (Join-Path $buildDir '*') -DestinationPath $dest
Write-Host "OK: $dest" -ForegroundColor Green
