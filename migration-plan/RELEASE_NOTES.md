# Release Notes

## 2026-02-27 — Monorepo Migration Completed

### Summary
- Completed extraction into dedicated apps for contacts, projects, and tasks.
- Finalized strict boundary model through `packages/*` shared contracts.
- Validated production deploy readiness and legacy tab route compatibility.

### Production Projects
- https://fomo-life-contacts.vercel.app
- https://fomo-life-projects.vercel.app
- https://fomo-life-tasks.vercel.app
- https://fomo-life.vercel.app

### Validation Evidence
- Lint/test/build gates passed for extracted apps.
- Production smoke checks passed for all extracted apps.
- Legacy redirects validated:
  - `/?tab=projects`
  - `/?tab=tasks`
  - `/?tab=people`
  - `/?tab=dreams`

### Notable Operational Fixes
- Root project install command standardized to `pnpm install --frozen-lockfile` for workspace dependency compatibility.
- Root auth gate adjusted so legacy `/?tab=...` handoff redirects execute for unauthenticated requests.

### Known Limitations
- No dedicated Playwright/Cypress suite is currently committed; smoke validation used scripted browser checks and manual sanity pass.
