# STEP-01 — Verify monorepo bootstrap (done)

## Goal
Confirm workspace, Turbo, and root scripts are healthy.

## Prompt for LLM
You are working in this repo. Verify that monorepo bootstrap is healthy **without changing architecture**.

Tasks:
1. Validate `pnpm-workspace.yaml`, `turbo.json`, root `package.json` scripts.
2. Run:
   - `pnpm install`
   - `pnpm dev -- --help`
   - `pnpm build:mono -- --filter=fomo-life --dry`
3. Report issues only if they block migration.
4. Keep all existing app behavior unchanged.

Acceptance criteria:
- Commands succeed.
- Existing root app commands still run.
- No unnecessary file edits.

## Status
Completed on 2026-02-27.
