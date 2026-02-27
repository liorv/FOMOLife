## Automated Deployment & Verification Steps

### STEP-15 — Create Vercel projects for projects and tasks apps

1. Install Vercel CLI: `npm install -g vercel`
2. Authenticate: `vercel login`
3. For each app:
	- `cd apps/projects && vercel link --project fomo-life-projects && vercel --prod`
	- `cd ../tasks && vercel link --project fomo-life-tasks && vercel --prod`

### STEP-16 — Configure environment variables for all apps
1. Use Vercel CLI or dashboard to set:
	- `NEXT_PUBLIC_PROJECTS_APP_URL` for projects
	- `NEXT_PUBLIC_TASKS_APP_URL` for tasks
	- `NEXT_PUBLIC_CONTACTS_APP_URL` for contacts
2. Confirm variables are available in production builds.

### STEP-17 — Validate build and deploy from main branch
1. Trigger production deploys for all apps from main branch.
2. Confirm build passes and apps are live at their URLs.

### STEP-18 — Test production app behavior and redirects
1. Run automated E2E tests (Cypress/Playwright) for navigation, redirects, and data boundaries.
2. Manually verify legacy URLs (e.g., `/?tab=dreams`) redirect as expected.

### STEP-19 — Update documentation and finalize migration
1. Document deployment process, environment variables, and app URLs in the repo.
2. Mark all migration steps as done in STATE.json.
# Migration Dash Plan

This directory contains **ordered, one-step-at-a-time instruction files** for continuing the monorepo migration manually, even if chat is interrupted.

## Execution order

1. STEP-01 — Verify monorepo bootstrap (already done)
2. STEP-02 — Harden shared packages (already done)
3. STEP-03 — Verify `apps/contacts` scaffold (already done)
4. STEP-04 — Extract contacts domain contracts + utilities
5. STEP-05 — Move contacts UI to `apps/contacts` with CSS Modules
6. STEP-06 — Wire contacts data + auth boundaries
7. STEP-07 — Enforce strict package boundaries in lint/TS
8. STEP-08 — Harden Turborepo tasks/caching/filters
9. STEP-09 — Vercel independent deployment setup
10. STEP-10 — Repeatable template for next tab extraction
11. STEP-11 — Decompose legacy giant CSS safely
12. STEP-12 — Extract projects into dedicated app (already done)
13. STEP-13 — Extract tasks into dedicated app (already done)

15. STEP-15 — Create Vercel projects for projects and tasks apps
16. STEP-16 — Configure environment variables for all apps
17. STEP-17 — Validate build and deploy from main branch
18. STEP-18 — Test production app behavior and redirects
19. STEP-19 — Update documentation and finalize migration

## How to use with any smart LLM

- Open one step file at a time.
- Paste the **Prompt for LLM** section into the LLM.
- Let it execute only that step.
- Run validations listed in that step.
- Update `STATE.json` after finishing.

## Response formatting preference

- Do not use folder icons or other decorative icons when replying.
- Use plain text paths only (example: apps/contacts).

## Rules for all steps

- Keep changes minimal and reversible.
- Do not break the existing root app while migrating.
- Never import from another app directly (`apps/*` -> `apps/*` forbidden).
- Shared code must flow through `packages/*` with explicit exports.
- Prefer CSS Modules in new apps; keep per-app styling isolated by default.

## Boundary policy

See `BOUNDARY_POLICY.md` for import rules, path alias guidance, and CI checks.

## Turbo filter examples

- `pnpm turbo dev --filter=contacts`
- `pnpm turbo build --filter=@myorg/ui`
- `pnpm turbo build --filter=contacts --dry`

Expected behavior:

- Filtered runs should only include matched targets (plus required dependency chain).
- Re-running the same filtered build should show local cache hits.

## Vercel deployment

See `VERCEL_PROJECTS.md` for per-project root/build/install settings, env isolation rules, and domain mapping guidance.

Naming convention for all future app projects: `fomo-life-{appname}`.
