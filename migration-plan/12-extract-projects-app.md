# STEP-12 — Extract projects tab into `apps/projects`

## Goal
Create a dedicated `apps/projects` Next.js app by extracting the existing projects experience from the root app, while preserving boundaries and deployability.

## Prompt for LLM
Execute extraction for the `projects` tab as the next app using `NEXT_TAB_EXTRACTION_TEMPLATE.md`.

Tasks:
1. Scaffold `apps/projects` using the same baseline shape as `apps/contacts`.
2. Move projects UI and related styling into `apps/projects` with CSS Modules (no new global coupling).
3. Keep shared contracts/utilities in `packages/*` and enforce no `apps/*` -> `apps/*` imports.
4. Wire data/auth via shared adapters (`packages/api-client` or app-local adapter depending on shared clients).
5. Configure Vercel project as `fomo-life-projects` with root directory `apps/projects`.
6. Run validations for this step:
   - `pnpm turbo lint --filter=projects`
   - `pnpm turbo test --filter=projects`
   - `pnpm turbo build --filter=projects`

Acceptance criteria:
- `apps/projects` builds and runs independently.
- No forbidden cross-app imports are introduced.
- Root app behavior remains intact for non-migrated tabs.
- Deployment settings are documented and aligned to naming convention.
