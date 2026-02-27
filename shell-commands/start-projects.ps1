Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

Assert-Command pnpm
Write-Host "Starting projects on http://localhost:3003"
Invoke-FromRepoRoot -Command pnpm -Args @('--filter', 'projects', 'dev')
