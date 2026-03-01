# FOMO Life Monorepo

This repository is fully migrated to a multi-app monorepo architecture.

## Architecture

Apps:
- `apps/framework` — framework host app (logo bar, navbar, content menu, hosted tabs)
- `apps/contacts` — contacts management app
- `apps/projects` — projects app
- `apps/tasks` — tasks app

Shared packages:
- `packages/types` — shared domain contracts
- `packages/utils` — shared utilities
- `packages/api-client` — shared API client wrappers
- `packages/ui` — shared UI primitives (for future consolidation)

Boundary rule:
- Apps do not import from other apps.
- Cross-app sharing happens only through `packages/*` exports.

## Production URLs

Canonical app URLs:
- Contacts: https://fomo-life-contacts.vercel.app
- Projects: https://fomo-life-projects.vercel.app
- Tasks: https://fomo-life-tasks.vercel.app
- Legacy root shell: https://fomo-life.vercel.app

Legacy compatibility redirects (root shell still handled by framework app):
- `https://fomo-life.vercel.app/?tab=people` → contacts app
- `https://fomo-life.vercel.app/?tab=projects` → projects app
- `https://fomo-life.vercel.app/?tab=tasks` → tasks app
- `https://fomo-life.vercel.app/?tab=dreams` → tasks app (legacy alias)

## Local development runbook

Prerequisites:
- Node.js 20+
- `pnpm` (workspace package manager)

Install:
- `pnpm install --frozen-lockfile`

Run all apps (Turbo):
- `pnpm dev:mono`

Run a single app:
- `pnpm --filter framework dev`
- `pnpm --filter contacts dev`
- `pnpm --filter projects dev`
- `pnpm --filter tasks dev`

Validation gates:
- `pnpm turbo lint --filter=framework --filter=contacts --filter=projects --filter=tasks`
- `pnpm turbo build --filter=framework --filter=contacts --filter=projects --filter=tasks`

## Deployment runbook (preview + production)

All projects deploy independently on Vercel.

Recommended release flow:
1. Merge approved changes to `main`.
2. Run local/CI validation gates.
3. Trigger production deploy per project:
   - `vercel link --project fomo-life-contacts --yes && vercel --prod --yes`
   - `vercel link --project fomo-life-projects --yes && vercel --prod --yes`
   - `vercel link --project fomo-life-tasks --yes && vercel --prod --yes`
   - `vercel link --project fomo-life --yes && vercel --prod --yes`
4. Verify aliases are live and healthy.

Notes:
- Root project `vercel.json` uses `pnpm install --frozen-lockfile` to support workspace deps.
- Each app has isolated runtime env and auth mode settings.

## Environment variable management

Cross-app URL vars (set for each extracted app and root shell as needed):
- `NEXT_PUBLIC_FRAMEWORK_APP_URL`
- `NEXT_PUBLIC_CONTACTS_APP_URL`
- `NEXT_PUBLIC_PROJECTS_APP_URL`
- `NEXT_PUBLIC_TASKS_APP_URL`

Per-app auth/runtime vars:
- Contacts: `CONTACTS_AUTH_MODE`, `CONTACTS_DEFAULT_USER_ID`
- Projects: `PROJECTS_AUTH_MODE`, `PROJECTS_DEFAULT_USER_ID`
- Tasks: `TASKS_AUTH_MODE`, `TASKS_DEFAULT_USER_ID`

Useful commands:
- `vercel env ls production`
- `vercel env add <NAME> production --value "<VALUE>" --force --yes`

Important:
- `NEXT_PUBLIC_*` variables are public at runtime.
- Never store secrets in `NEXT_PUBLIC_*` variables.

## Rollback and incident response

If a production issue is detected:
1. Identify impacted app(s) and deployment URL in Vercel.
2. Roll back alias to a previous healthy deployment from Vercel dashboard.
3. Confirm health:
   - app home page returns expected UI
   - app API endpoint returns 200 (`/api/contacts`, `/api/projects`, `/api/tasks`)
   - root legacy tab redirects still resolve correctly
4. If issue is root shell only, prioritize restoring redirect continuity from `/?tab=...` URLs.
5. Create follow-up fix and redeploy with the same validation gates.

## Migration parity evidence (final)

Build/test evidence:
- `pnpm turbo lint --filter=contacts --filter=projects --filter=tasks` passed
- `pnpm turbo test --filter=contacts --filter=projects --filter=tasks` passed
- `pnpm turbo build --filter=contacts --filter=projects --filter=tasks` passed

Production smoke evidence:
- Contacts/Projects/Tasks pages load and show expected primary controls.
- API endpoints are healthy:
  - `https://fomo-life-contacts.vercel.app/api/contacts`
  - `https://fomo-life-projects.vercel.app/api/projects`
  - `https://fomo-life-tasks.vercel.app/api/tasks`
- Legacy root tab redirects verified:
  - `projects`, `tasks`, `people`, `dreams` all resolve to expected app URLs.

Known limitations:
- No dedicated Playwright/Cypress E2E suite is currently checked into this repository.
- Smoke parity was validated via scripted browser checks and manual sanity confirmation.

## Migration plan status

Migration execution is complete.
See:
- `migration-plan/STATE.json`
- `migration-plan/README.md`
- `migration-plan/VERCEL_PROJECTS.md`
