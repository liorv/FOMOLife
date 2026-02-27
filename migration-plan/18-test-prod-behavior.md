# STEP-18 — Test production app behavior and redirects

## Goal
Verify functional parity in production after merge/deploy, including routing, auth boundaries, and legacy URL compatibility.

## Prompt for LLM
Execute smoke + regression validation against deployed production apps and confirm parity with legacy behavior.

Tasks:
1. Define production smoke suite for critical user flows per app:
   - contacts: list/search/edit/invite flows
   - projects: list/filter/create/edit flows
   - tasks: list/filter/create/edit/complete flows
2. Validate cross-app navigation links and URL handoff behavior between extracted apps.
3. Validate auth-mode boundaries per app (cookie/session expectations, unauth behavior).
4. Validate legacy route/query compatibility from old tab entry points (for example `/?tab=...`) and confirm graceful redirects/fallbacks.
5. Run automated E2E tests against production URLs (Playwright/Cypress) where available.
6. Perform a manual sanity pass and capture defects with priority/severity.

Suggested commands:
- `pnpm test:e2e` (or project-specific equivalent)
- `vercel inspect <deployment-url> --logs`

Acceptance criteria:
- Critical production flows pass across all apps.
- Legacy deep-links/redirects behave correctly.
- No P0/P1 regressions remain open.
