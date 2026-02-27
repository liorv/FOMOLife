Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

& "$PSScriptRoot\ship-contacts.ps1"
& "$PSScriptRoot\ship-projects.ps1"
& "$PSScriptRoot\ship-tasks.ps1"
