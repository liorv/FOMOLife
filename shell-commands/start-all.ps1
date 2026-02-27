Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

Assert-Command pnpm
Write-Host "Starting all apps via turbo"
Invoke-FromRepoRoot -Command pnpm -Args @('dev:mono')
