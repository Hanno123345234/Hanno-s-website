param(
  [ValidateSet('html', 'skia')]
  [string]$Renderer = 'html',
  [string]$RepoName,
  [switch]$NoPwa
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here '..')

if (-not $RepoName -or $RepoName.Trim().Length -eq 0) {
  $RepoName = Split-Path -Leaf $root
}

$baseHref = "/$RepoName/"

Write-Host "Building for GitHub Pages (RepoName=$RepoName, BaseHref=$baseHref) ..." -ForegroundColor Cyan
& "$here\build_web_release.ps1" -Renderer $Renderer -BaseHref $baseHref -NoPwa:$NoPwa
