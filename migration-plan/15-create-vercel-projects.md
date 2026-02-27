# STEP-15 — Create Vercel projects for projects and tasks apps

## Goal
Create and correctly configure independent Vercel projects for `apps/projects` and `apps/tasks` with monorepo-safe settings.

## Prompt for LLM
Execute Vercel project creation and initial deployment wiring for extracted apps.

Tasks:
1. Ensure both projects exist in Vercel with required naming:
   - `fomo-life-projects`
   - `fomo-life-tasks`
2. Verify project-level settings in Vercel Dashboard/CLI:
   - Root Directory:
     - `apps/projects` for projects
     - `apps/tasks` for tasks
   - Framework Preset: `Next.js`
   - Install Command: `pnpm install --frozen-lockfile`
   - Build Command:
     - `pnpm --filter projects build`
     - `pnpm --filter tasks build`
3. Confirm app-local `vercel.json` files align with above settings (no unsupported keys such as `rootDirectory`).
4. Link local workspace to each Vercel project and perform one production deployment for each app.
5. Capture deployment URLs for handoff and later env var wiring.

Suggested commands:
- `vercel project inspect fomo-life-projects`
- `vercel project inspect fomo-life-tasks`
- `vercel --prod` (with project linked)

Acceptance criteria:
- Both Vercel projects are created and correctly rooted.
- Both apps have at least one successful production deployment.
- Settings are reproducible and consistent with monorepo layout.
