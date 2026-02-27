Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

Assert-Command pnpm
Invoke-FromRepoRoot -Command pnpm -Args @('--filter', 'projects', 'build')
