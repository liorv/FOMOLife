Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

Assert-Command pnpm
Write-Host "Starting contacts on http://localhost:3002"
Invoke-FromRepoRoot -Command pnpm -Args @('--filter', 'contacts', 'dev')
