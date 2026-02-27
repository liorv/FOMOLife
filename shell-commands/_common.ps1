Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Script:RepoRoot = Split-Path -Parent $PSScriptRoot

function Assert-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

function Invoke-FromRepoRoot {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [string[]]$Args = @()
  )

  Push-Location $Script:RepoRoot
  try {
    & $Command @Args
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed: $Command $($Args -join ' ')"
    }
  }
  finally {
    Pop-Location
  }
}

function Stop-Port {
  param([Parameter(Mandatory = $true)][int]$Port)

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Host "No listener on port $Port"
    return
  }

  $procIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $procIds) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped PID $procId on port $Port"
  }
}
