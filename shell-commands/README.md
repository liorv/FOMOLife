# shell-commands (PowerShell)

PowerShell scripts for common monorepo operations: start, stop, build, and ship.

## Apps and ports

- contacts: `3002`
- projects: `3003`
- tasks: `3004`

## Start

- `./shell-commands/start-contacts.ps1`
- `./shell-commands/start-projects.ps1`
- `./shell-commands/start-tasks.ps1`
- `./shell-commands/start-all.ps1`
- alias: `./shell-commands/run-tasks.ps1`

## Stop

- `./shell-commands/stop-contacts.ps1`
- `./shell-commands/stop-projects.ps1`
- `./shell-commands/stop-tasks.ps1`
- `./shell-commands/stop-all.ps1`

## Build

- `./shell-commands/build-contacts.ps1`
- `./shell-commands/build-projects.ps1`
- `./shell-commands/build-tasks.ps1`
- `./shell-commands/build-all.ps1`

## Ship (Vercel production)

- `./shell-commands/ship-contacts.ps1`
- `./shell-commands/ship-projects.ps1`
- `./shell-commands/ship-tasks.ps1`
- `./shell-commands/ship-all.ps1`

## Notes

- Scripts run from repo root automatically.
- `ship-*` scripts require Vercel CLI auth (`vercel login`).
- If script execution is restricted, run once in your terminal session:
  - `Set-ExecutionPolicy -Scope Process Bypass`
