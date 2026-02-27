# shell-commands

Helper shell scripts for common monorepo operations: start, stop, build, and ship.

## Apps and ports

- contacts: `3002`
- projects: `3003`
- tasks: `3004`

## Start

- `./shell-commands/start-contacts.sh`
- `./shell-commands/start-projects.sh`
- `./shell-commands/start-tasks.sh`
- `./shell-commands/start-all.sh`

## Stop

- `./shell-commands/stop-contacts.sh`
- `./shell-commands/stop-projects.sh`
- `./shell-commands/stop-tasks.sh`
- `./shell-commands/stop-all.sh`

## Build

- `./shell-commands/build-contacts.sh`
- `./shell-commands/build-projects.sh`
- `./shell-commands/build-tasks.sh`
- `./shell-commands/build-all.sh`

## Ship (Vercel production)

- `./shell-commands/ship-contacts.sh`
- `./shell-commands/ship-projects.sh`
- `./shell-commands/ship-tasks.sh`
- `./shell-commands/ship-all.sh`

## Notes

- These scripts run from repo root automatically.
- `ship-*` scripts require Vercel CLI auth (`vercel login`).
- On Windows PowerShell, run with Git Bash/WSL, or use:
  - `bash ./shell-commands/start-contacts.sh`
