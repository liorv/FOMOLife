# STEP-16 — Configure environment variables for all apps

## Goal
Set and validate environment variables across contacts/projects/tasks so dev and production behavior are consistent.

## Prompt for LLM
Configure project-scoped Vercel environment variables and local `.env.example` parity for all extracted apps.

Tasks:
1. Inventory required variables per app from code usage (`process.env.*`) and existing `.env.example` files.
2. Set required Vercel env vars in each project (`Development`, `Preview`, `Production`) using CLI or dashboard.
3. Ensure cross-app URL variables are wired for runtime navigation where needed:
   - `NEXT_PUBLIC_CONTACTS_APP_URL`
   - `NEXT_PUBLIC_PROJECTS_APP_URL`
   - `NEXT_PUBLIC_TASKS_APP_URL`
4. Keep auth-mode / user defaults app-scoped (do not leak unrelated vars between projects).
5. Update `.env.example` files to reflect current required variables and defaults.
6. Pull environment locally (`vercel pull`) and run app builds with production-like env values.

Suggested commands:
- `vercel env ls`
- `vercel env add`
- `vercel pull`
- `pnpm --filter contacts build`
- `pnpm --filter projects build`
- `pnpm --filter tasks build`

Acceptance criteria:
- Each Vercel project has complete env vars for all environments.
- `.env.example` files are accurate and current.
- All extracted apps build successfully with configured env.
