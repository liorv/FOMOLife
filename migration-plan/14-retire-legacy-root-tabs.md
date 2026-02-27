# STEP-14 — Retire legacy root tab runtime and finalize boundaries

## Goal
Complete migration by removing tab-runtime responsibilities from the legacy root app (`src/App.js`) and preserving only a minimal shell/redirect role, while keeping extracted apps (`apps/contacts`, `apps/projects`, `apps/tasks`) as the source of truth.

## Prompt for LLM
Execute a post-extraction hardening pass to retire legacy root tab behavior and verify boundary integrity.

Tasks:
1. Remove remaining root-tab runtime responsibilities from `src/App.js` that duplicate extracted app logic (task/project/contact domain behavior should not be maintained in two places).
2. Keep root behavior minimal and non-breaking (landing shell, navigation redirect, or compatibility wrapper only).
3. Ensure no accidental cross-app imports (`apps/*` must not import from other `apps/*`).
4. Keep shared code usage routed through package public APIs (`packages/*`) where applicable.
5. Verify Dreams tab is fully removed from runtime and URL compatibility remains safe (legacy `tab=dreams` handled gracefully).
6. Run validations for this step:
   - `pnpm turbo lint --filter=contacts --filter=projects --filter=tasks`
   - `pnpm turbo test --filter=contacts --filter=projects --filter=tasks`
   - `pnpm turbo build --filter=contacts --filter=projects --filter=tasks`

Acceptance criteria:
- Root app no longer carries duplicate tab-domain runtime logic.
- Extracted apps remain independently runnable/buildable.
- No forbidden cross-app imports are introduced.
- Monorepo filtered lint/test/build passes for extracted apps.