# tasks

Independent Next.js App Router app for the Tasks tab domain.

## Current state

- Tasks UI is extracted in `components/TasksPage.tsx` with CSS Modules.
- Tasks CRUD flows through `app/api/tasks` via app-local adapters.
- Auth boundary is controlled by `TASKS_AUTH_MODE` and cookie `tasks_session`.

## Commands

- `pnpm --filter tasks dev`
- `pnpm --filter tasks build`
- `pnpm --filter tasks lint`
- `pnpm --filter tasks test`

## Deployment

- Vercel root directory: `apps/tasks`
- App-scoped config: `apps/tasks/vercel.json`