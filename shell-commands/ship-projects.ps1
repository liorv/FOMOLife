Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

Assert-Command vercel
Invoke-FromRepoRoot -Command vercel -Args @('link', '--project', 'fomo-life-projects', '--yes')
Invoke-FromRepoRoot -Command vercel -Args @('--prod', '--yes')
