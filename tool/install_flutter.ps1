$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here '..')
$workspaceTools = Resolve-Path (Join-Path $root '..\tools')

$zipPath = Join-Path $workspaceTools 'flutter_sdk.zip'
$destRoot = Join-Path $workspaceTools 'flutter'

Write-Host "Workspace tools: $workspaceTools"
Write-Host "Zip: $zipPath"
Write-Host "Dest: $destRoot"

if (-not (Test-Path $zipPath)) {
  Write-Host "ERROR: flutter_sdk.zip not found at $zipPath"
  Write-Host "Download Flutter stable zip and place it there, then rerun."
  exit 1
}

# Clean and extract
if (Test-Path $destRoot) {
  Write-Host 'Removing existing tools/flutter ...'
  Remove-Item -Recurse -Force $destRoot
}

New-Item -ItemType Directory -Force -Path $workspaceTools | Out-Null
Write-Host 'Extracting Flutter SDK (this can take a few minutes) ...'
Expand-Archive -Path $zipPath -DestinationPath $workspaceTools -Force

# The zip contains a top-level folder named 'flutter'
$flutterBat = Join-Path $destRoot 'bin\flutter.bat'
if (-not (Test-Path $flutterBat)) {
  Write-Host "ERROR: Expected $flutterBat but it was not found."
  Write-Host 'Open tools/flutter and confirm it contains bin/flutter.bat'
  exit 1
}

Write-Host 'Flutter installed locally:'
& $flutterBat --version

Write-Host "\nNext: run .\tool\run_web.ps1 (it will use the local Flutter)."
