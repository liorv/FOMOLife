# STEP-13 — Extract tasks tab into `apps/tasks`

## Goal
Create a dedicated `apps/tasks` Next.js app by extracting the existing tasks experience from the root app, while preserving boundaries and deployability.

## Prompt for LLM
Execute extraction for the `tasks` tab as the next app using `NEXT_TAB_EXTRACTION_TEMPLATE.md`.

Tasks:
1. Scaffold `apps/tasks` using the same baseline shape as `apps/contacts`.
2. Move tasks UI and related styling into `apps/tasks` with CSS Modules (no new global coupling).
3. Keep shared contracts/utilities in `packages/*` and enforce no `apps/*` -> `apps/*` imports.
4. Wire data/auth via shared adapters (`packages/api-client` or app-local adapter depending on shared clients).
5. Configure Vercel project as `fomo-life-tasks` with root directory `apps/tasks`.
6. Run validations for this step:
   - `pnpm turbo lint --filter=tasks`
   - `pnpm turbo test --filter=tasks`
   - `pnpm turbo build --filter=tasks`

Acceptance criteria:
- `apps/tasks` builds and runs independently.
- No forbidden cross-app imports are introduced.
- Root app behavior remains intact for non-migrated tabs.
- Deployment settings are documented and aligned to naming convention.