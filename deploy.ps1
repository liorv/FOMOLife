<#
.SYNOPSIS
    Deploy one or all Next.js apps under the `apps` folder to Vercel.

.DESCRIPTION
    Looks for subdirectories of `apps` that contain a `vercel.json` and
    runs `vercel --prod` inside each one.  Because the git integration is
    disabled in every config, these are manual deployments only.

.PARAMETER App
    Name of a single app to deploy (e.g. contacts, projects, tasks, framework).
    Omit to deploy all apps.

.PARAMETER Force
    If supplied the script passes `--force` to the CLI to bypass any
    build cache.

.EXAMPLE
    .\deploy.ps1

    Deploys contacts, projects, tasks and framework in sequence.

    .\deploy.ps1 -App projects

    Deploys only the projects app.

    .\deploy.ps1 -App projects -Force

    Deploys only the projects app, bypassing the build cache.

    .\deploy.ps1 -Force

    Deploys all apps with a fresh rebuild.
#>

param(
    [string]$App = "",
    [switch]$Force
)

$base = "apps"
if (-not (Test-Path $base)) {
    Write-Error "`$base folder not found; run this from the repo root."
    exit 1
}

# Validate single-app name if provided
if ($App -ne "") {
    $appPath = Join-Path $base $App
    if (-not (Test-Path $appPath -PathType Container)) {
        $available = (Get-ChildItem -Path $base -Directory).Name -join ", "
        Write-Error "App '$App' not found. Available apps: $available"
        exit 1
    }
}

$flags = "--prod"
if ($Force) { $flags += " --force" }

$dirs = if ($App -ne "") {
    Get-Item (Join-Path $base $App)
} else {
    Get-ChildItem -Path $base -Directory
}

$dirs | ForEach-Object {
    $appDir = $_.FullName
    $linkFile = Join-Path $appDir '.vercel\project.json'
    if (Test-Path $linkFile) {
        Write-Host "`n=== deploying $($_.Name) ===" -ForegroundColor Cyan

        # Read project + org IDs from the .vercel/project.json link file
        $link = Get-Content $linkFile -Raw | ConvertFrom-Json
        $env:VERCEL_ORG_ID     = $link.orgId
        $env:VERCEL_PROJECT_ID = $link.projectId

        # Run from the repo root; Vercel uses rootDirectory (stored in cloud
        # project settings) to locate the right sub-folder automatically.
        Invoke-Expression "vercel $flags"
        $code = $LASTEXITCODE

        # Clean up env vars so they don't bleed into the next iteration
        Remove-Item Env:VERCEL_ORG_ID     -ErrorAction SilentlyContinue
        Remove-Item Env:VERCEL_PROJECT_ID -ErrorAction SilentlyContinue

        if ($code -ne 0) {
            Write-Warning "deployment of $($_.Name) failed (exit $code)"
            exit $code
        }
    }
}

Write-Host "`nall deployments finished." -ForegroundColor Green
