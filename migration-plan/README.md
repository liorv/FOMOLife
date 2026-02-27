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
10. STEP-10 — Repeatable template for next tab extraction (**NEXT**)
11. STEP-11 — Decompose legacy giant CSS safely

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
