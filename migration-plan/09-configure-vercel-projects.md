# STEP-09 — Configure independent Vercel projects

## Goal
Deploy each app independently from one repo.

## Prompt for LLM
Prepare Vercel configuration instructions and repo files for independent app deployment.

Tasks:
1. For each app (starting with contacts), define:
   - Root directory (`apps/contacts`)
   - Build command (`pnpm --filter contacts build` or turbo equivalent)
   - Install command (`pnpm install --frozen-lockfile`)
2. Document required env vars per app.
3. Keep project-level envs isolated.
4. Add preview/prod domain mapping notes.
5. Verify app builds in local commands that mirror Vercel.

Acceptance criteria:
- contacts app can be deployed independently.
- deployment settings are documented and reproducible.
