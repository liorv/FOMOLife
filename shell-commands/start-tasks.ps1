Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

Assert-Command pnpm
Write-Host "Starting tasks on http://localhost:3004"
Invoke-FromRepoRoot -Command pnpm -Args @('--filter', 'tasks', 'dev')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Starting tasks on http://localhost:3004"
pnpm --filter tasks dev
