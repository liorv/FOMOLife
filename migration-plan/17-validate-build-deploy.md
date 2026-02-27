# STEP-17 — Validate build and deploy from main branch

## Goal
Prove the monorepo can build and deploy extracted apps from `main` using production pipeline settings.

## Prompt for LLM
Run CI-equivalent validations and confirm successful deploys from `main` for contacts/projects/tasks.

Tasks:
1. Ensure branch is up to date and merge-ready:
   - Rebase or merge latest `main` into migration branch.
   - Resolve conflicts without violating app boundaries.
2. Run monorepo validation gates locally (or CI):
   - `pnpm turbo lint --filter=contacts --filter=projects --filter=tasks`
   - `pnpm turbo test --filter=contacts --filter=projects --filter=tasks`
   - `pnpm turbo build --filter=contacts --filter=projects --filter=tasks`
3. Open/verify PR to `main` with required checks passing.
4. Merge to `main` using team policy (squash/merge/rebase).
5. Trigger production deployments from `main` for each Vercel project and verify no drift from prior successful deploys.

Acceptance criteria:
- Lint/test/build gates pass for all extracted apps.
- PR is merged to `main` with required checks green.
- Production deployments from `main` succeed for all apps.
