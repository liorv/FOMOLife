Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

Stop-Port -Port 3002
Stop-Port -Port 3003
Stop-Port -Port 3004
