param(
  [ValidateSet('chrome', 'server')]
  [string]$Mode = 'chrome',
  [int]$Port = 8080,
  [switch]$OpenFirewall,
  [ValidateSet('debug', 'profile', 'release')]
  [string]$BuildMode = 'debug',
  [switch]$Wasm,
  [switch]$HtmlRenderer
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here '..')
Set-Location $root

Write-Host "Project: $root"

$localFlutter = Resolve-Path (Join-Path $root '..\tools\flutter\bin\flutter.bat') -ErrorAction SilentlyContinue
$flutterCmd = $null

if ($localFlutter -and (Test-Path $localFlutter)) {
  $flutterCmd = $localFlutter
  Write-Host "Flutter (local): $flutterCmd"
} else {
  $flutter = Get-Command flutter -ErrorAction SilentlyContinue
  if ($flutter) {
    $flutterCmd = $flutter.Source
    Write-Host "Flutter (PATH): $flutterCmd"
  }
}

if (-not $flutterCmd) {
  Write-Host "ERROR: Flutter not found."
  Write-Host "Fix: run .\tool\install_flutter.ps1 (uses tools\flutter_sdk.zip)"
  exit 1
}

& $flutterCmd --version

# Ensure web is enabled
& $flutterCmd config --enable-web | Out-Host

# Ensure platform folders exist
& "$here\bootstrap.ps1" -FlutterCmd $flutterCmd

& $flutterCmd pub get

# Preflight: ensure port is free (common error: OS Error 10048)
try {
  $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($listening) {
    Write-Host "\nERROR: Port $Port is already in use on this PC." -ForegroundColor Red
    Write-Host "Fix options:" -ForegroundColor Yellow
    Write-Host "  1) Use another port, e.g.: .\tool\run_web.ps1 -Mode server -Port 8081" -ForegroundColor Yellow
    Write-Host "  2) Find/stop the process using the port:" -ForegroundColor Yellow
    Write-Host "     Get-NetTCPConnection -LocalPort $Port -State Listen | Select-Object -First 1 -ExpandProperty OwningProcess" -ForegroundColor Yellow
    Write-Host "     Stop-Process -Id <PID> -Force" -ForegroundColor Yellow
    exit 1
  }
} catch {
  # If we can't inspect ports, continue and let Flutter report a bind error.
}

# Print IPv4 addresses (Wi-Fi/Ethernet)
Write-Host "\nOpen on THIS PC (same machine): http://127.0.0.1:$Port"
Write-Host "IMPORTANT: 127.0.0.1 only works on THIS PC, not on your phone." -ForegroundColor Yellow

$ips = @()
try {
  $ips = Get-NetIPConfiguration -ErrorAction Stop |
    Where-Object {
      $_.IPv4Address -ne $null -and
      $_.NetAdapter -ne $null -and
      $_.NetAdapter.Status -eq 'Up' -and
      $_.NetAdapter.InterfaceDescription -notmatch 'Hyper-V|Virtual|VMware|WSL|Loopback'
    } |
    ForEach-Object { $_.IPv4Address.IPAddress } |
    Where-Object { $_ -notlike '169.254*' -and $_ -ne '127.0.0.1' } |
    Select-Object -Unique
} catch {
  $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' } |
    Select-Object -ExpandProperty IPAddress
}

if ($ips -and $ips.Count -gt 0) {
  Write-Host "Open on phone (same Wi-Fi):"
  foreach ($ip in $ips) {
    Write-Host "  http://${ip}:$Port"
  }
} else {
  Write-Host "Could not auto-detect IPv4. Run 'ipconfig' and look for IPv4 address."
}

if ($OpenFirewall) {
  # Most phone connection failures are Windows Firewall blocking inbound TCP.
  $ruleName = "HabitChallenge Web $Port"
  try {
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (-not $existing) {
      New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Profile Any -ErrorAction Stop | Out-Null
      Write-Host "Firewall: opened inbound TCP $Port (rule: '$ruleName')." -ForegroundColor Green
    } else {
      Write-Host "Firewall: rule already exists ('$ruleName')." -ForegroundColor DarkGray
    }
  } catch {
    Write-Host "Firewall: could not create rule automatically (not running as Admin?)." -ForegroundColor Yellow
    Write-Host "Fix: run PowerShell as Administrator and execute:" -ForegroundColor Yellow
    Write-Host "  New-NetFirewallRule -DisplayName '$ruleName' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Profile Any" -ForegroundColor Yellow
  }
}

Write-Host "\nStarting Flutter web-server on 0.0.0.0:$Port ... (keep this terminal open)"
if ($Mode -eq 'chrome') {
  Write-Host 'Launching in Chrome (easiest way to preview on PC) ...'
  & $flutterCmd run -d chrome
} else {
  # Safari often shows a white screen in DEBUG web-server mode (DDC/debug tooling).
  # For phone previews, RELEASE is the most reliable.
  if ($BuildMode -eq 'debug') {
    $BuildMode = 'release'
  }

  # Note: Flutter 3.38+ removed the '--pwa-strategy' flag from 'flutter run -d web-server'.
  $flutterArgs = @('run', '-d', 'web-server', '--web-hostname', '0.0.0.0', '--web-port', "$Port")
  if ($BuildMode -eq 'release') { $flutterArgs += '--release' }
  elseif ($BuildMode -eq 'profile') { $flutterArgs += '--profile' }

  if ($Wasm) {
    $flutterArgs += '--wasm'
  }

  # iOS Safari is often more reliable with the HTML renderer.
  if ($HtmlRenderer) {
    $flutterArgs += @('--dart-define', 'FLUTTER_WEB_USE_SKIA=false')
  }

  Write-Host "Mode: $BuildMode  Wasm: $Wasm" -ForegroundColor DarkGray
  & $flutterCmd @flutterArgs
}
