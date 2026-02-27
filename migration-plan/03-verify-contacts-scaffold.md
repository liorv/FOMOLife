# STEP-03 — Verify contacts app scaffold (done)

## Goal
Confirm `apps/contacts` can run/typecheck/build independently.

## Prompt for LLM
You are working in this repo. Validate the `apps/contacts` scaffold only.

Tasks:
1. Check:
   - `apps/contacts/package.json`
   - `apps/contacts/next.config.ts`
   - `apps/contacts/tsconfig.json`
   - `apps/contacts/app/*`
2. Run:
   - `pnpm --filter contacts typecheck`
   - `pnpm --filter contacts build`
3. Fix only scaffolding/type config issues.

Acceptance criteria:
- contacts app typecheck/build succeed.
- app remains independent from legacy root app runtime.

## Status
Completed on 2026-02-27.
