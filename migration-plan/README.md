# Migration Dash Plan

This directory contains the step-by-step migration execution records and operational references.

## Status

Migration is complete as of 2026-02-27.

Final state file:
- `STATE.json`

## Step files

- STEP-01 `01-verify-monorepo-bootstrap.md`
- STEP-02 `02-harden-shared-packages.md`
- STEP-03 `03-verify-contacts-scaffold.md`
- STEP-04 `04-extract-contacts-domain.md`
- STEP-05 `05-migrate-contacts-ui-css-modules.md`
- STEP-06 `06-wire-contacts-data-auth.md`
- STEP-07 `07-enforce-strict-boundaries.md`
- STEP-08 `08-harden-turbo-pipelines.md`
- STEP-09 `09-configure-vercel-projects.md`
- STEP-10 `10-next-tab-template.md`
- STEP-11 `11-split-legacy-giant-css.md`
- STEP-12 `12-extract-projects-app.md`
- STEP-13 `13-extract-tasks-app.md`
- STEP-14 `14-retire-legacy-root-tabs.md`
- STEP-15 `15-create-vercel-projects.md`
- STEP-16 `16-configure-env-vars.md`
- STEP-17 `17-validate-build-deploy.md`
- STEP-18 `18-test-prod-behavior.md`
- STEP-19 `19-update-docs-finalize.md`

## Supporting policy and runbooks

- `BOUNDARY_POLICY.md`
- `VERCEL_PROJECTS.md`
- `STATE_TEMPLATE.json`
- `NEXT_TAB_EXTRACTION_TEMPLATE.md`
- `EXECUTE_CURRENT_STEP_PROMPT.md`

## Operational notes

- Keep app boundaries strict (`apps/*` must not import from `apps/*`).
- Share code only through `packages/*` exports.
- Use Turbo filters to limit scope during local validation.
- Keep Vercel environment variables project-scoped.
