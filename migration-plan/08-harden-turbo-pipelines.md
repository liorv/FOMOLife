# STEP-08 — Harden Turbo pipelines, caching, filtering

## Goal
Optimize developer flow and CI by making Turbo tasks precise and cacheable.

## Prompt for LLM
Tune Turborepo task graph for this repo.

Tasks:
1. Update `turbo.json` with accurate outputs per package/app.
2. Ensure `build` depends on `^build` where needed.
3. Keep `dev` non-cached and persistent.
4. Add and verify filtered commands examples in docs:
   - `pnpm turbo dev --filter=contacts`
   - `pnpm turbo build --filter=@myorg/ui`
5. Validate task behavior with dry-runs and real runs.

Acceptance criteria:
- Turbo executes correct subset with filters.
- Cache hits are visible on repeated runs.
- No accidental overbuild of unrelated apps.
