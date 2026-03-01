# Vercel Projects Setup (Final)

This monorepo is deployed as four independent Vercel projects:

- `fomo-life` (framework host shell)
- `fomo-life-contacts`
- `fomo-life-projects`
- `fomo-life-tasks`

## Project mapping

### `fomo-life-contacts`
- Root Directory: `apps/contacts`
- Framework: Next.js
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm --filter contacts build`
- Canonical URL: https://fomo-life-contacts.vercel.app

### `fomo-life-projects`
- Root Directory: `apps/projects`
- Framework: Next.js
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm --filter projects build`
- Canonical URL: https://fomo-life-projects.vercel.app

### `fomo-life-tasks`
- Root Directory: `apps/tasks`
- Framework: Next.js
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm --filter tasks build`
- Canonical URL: https://fomo-life-tasks.vercel.app

### `fomo-life` (framework host)
- Root Directory: `apps/framework`
- Framework: Next.js
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm --filter framework build`
- Canonical URL: https://fomo-life.vercel.app

## Environment variable model

Cross-app URL vars (required where relevant):
- `NEXT_PUBLIC_CONTACTS_APP_URL=https://fomo-life-contacts.vercel.app`
- `NEXT_PUBLIC_PROJECTS_APP_URL=https://fomo-life-projects.vercel.app`
- `NEXT_PUBLIC_TASKS_APP_URL=https://fomo-life-tasks.vercel.app`

Per-app auth vars:
- contacts: `CONTACTS_AUTH_MODE`, `CONTACTS_DEFAULT_USER_ID`
- projects: `PROJECTS_AUTH_MODE`, `PROJECTS_DEFAULT_USER_ID`
- tasks: `TASKS_AUTH_MODE`, `TASKS_DEFAULT_USER_ID`

Framework auth vars:
- `FRAMEWORK_AUTH_MODE`
- `FRAMEWORK_DEFAULT_USER_ID`

## Deployment runbook

From repository root:

1. Validate changes:
   - `pnpm turbo lint --filter=contacts --filter=projects --filter=tasks`
   - `pnpm turbo test --filter=contacts --filter=projects --filter=tasks`
   - `pnpm turbo build --filter=contacts --filter=projects --filter=tasks`
2. Deploy projects:
   - `Push-Location apps/framework; vercel link --project fomo-life --yes; vercel --prod --yes; Pop-Location`
   - `vercel link --project fomo-life-contacts --yes && vercel --prod --yes`
   - `vercel link --project fomo-life-projects --yes && vercel --prod --yes`
   - `vercel link --project fomo-life-tasks --yes && vercel --prod --yes`
3. Verify aliases are updated and healthy.

## Legacy route compatibility

The root shell preserves old entry points and redirects:
- `/?tab=projects` → projects app
- `/?tab=tasks` → tasks app
- `/?tab=people` → contacts app
- `/?tab=dreams` → tasks app

## Rollback runbook

For any incident:
1. Identify failed app deployment in Vercel.
2. Reassign alias to last healthy deployment.
3. Re-check smoke endpoints/UI:
   - root redirect paths above
   - `/api/contacts`, `/api/projects`, `/api/tasks`
4. Patch and redeploy with full validation gates.
