# projects

Independent Next.js App Router app for the Projects tab domain.

## Current state

- Projects UI entrypoint is implemented in `components/ProjectsPage.tsx` using CSS Modules.
- Projects data flow goes through `app/api/projects` via an app-local client adapter.
- Auth boundary is controlled by `PROJECTS_AUTH_MODE` and cookie `projects_session`.
- Full parity with legacy projects dashboard/editor is still pending in STEP-12.

## Commands

- `pnpm --filter projects dev`
- `pnpm --filter projects build`
- `pnpm --filter projects typecheck`

## Deployment

- Vercel root directory: `apps/projects`
- App-scoped config: `apps/projects/vercel.json`
