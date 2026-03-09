<#
.SYNOPSIS
    Deploy every Next.js app under the `apps` folder to Vercel.

.DESCRIPTION
    Looks for subdirectories of `apps` that contain a `vercel.json` and
    runs `vercel --prod` inside each one.  Because the git integration is
    disabled in every config, these are manual deployments only.

.PARAMETER Force
    If supplied the script passes `--force` to the CLI to bypass any
    build cache.

.EXAMPLE
    .\deploy.ps1

    Deploys contacts, projects, tasks and framework in sequence.

    .\deploy.ps1 -Force

    Same as above but forces a fresh rebuild.
#>

param(
    [switch]$Force
)

$base = "apps"
if (-not (Test-Path $base)) {
    Write-Error "`$base folder not found; run this from the repo root."
    exit 1
}

$flags = "--prod"
if ($Force) { $flags += " --force" }

Get-ChildItem -Path $base -Directory | ForEach-Object {
    $appDir = $_.FullName
    $config = Join-Path $appDir 'vercel.json'
    if (Test-Path $config) {
        Write-Host "`n=== deploying $($_.Name) ===" -ForegroundColor Cyan
        # run vercel from the repo root but point it at the app's local config
        $settings = Get-Content $config -Raw | ConvertFrom-Json
        $escapedConfig = $config -replace "'","''"
        $cmd = "vercel $flags --local-config `"$escapedConfig`""
        if ($settings.projectId) {
            $cmd += " --project $($settings.projectId)"
        } elseif ($settings.name) {
            $cmd += " --name $($settings.name)"
        }
        Invoke-Expression $cmd
        $code = $LASTEXITCODE
        if ($code -ne 0) {
            Write-Warning "deployment of $($_.Name) failed (exit $code)"
            exit $code
        }
    }
}

Write-Host "`nall deployments finished." -ForegroundColor Green
