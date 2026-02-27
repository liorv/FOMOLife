# STEP-07 — Enforce strict cross-app boundaries

## Goal
Prevent architecture regressions with lint + TypeScript boundaries.

## Prompt for LLM
Implement strict boundary enforcement for monorepo imports.

Tasks:
1. Strengthen ESLint rules to block:
   - app-to-app imports
   - deep imports into package internals
2. Ensure package `exports` fields expose only public APIs.
3. Add path alias policy docs in migration plan or root docs.
4. Add CI-friendly checks:
   - `pnpm lint:mono`
   - `pnpm typecheck:mono`
5. Keep fixes scoped to boundary enforcement.

Acceptance criteria:
- Attempted forbidden imports fail lint/typecheck.
- Public package APIs are explicit and stable.
