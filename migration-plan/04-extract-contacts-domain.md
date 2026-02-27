# STEP-04 — Extract contacts domain contracts + utilities (NEXT)

## Goal
Move contacts-domain data contracts and pure helpers into shared packages before moving heavy UI.

## Prompt for LLM
You are migrating Contacts domain with strict boundaries. Execute only this step.

Constraints:
- No cross-app imports.
- Keep root app functional.
- Keep contacts app functional.
- Extract only domain contracts + pure logic (no large UI moves yet).

Tasks:
1. Create/expand shared exports:
   - `@myorg/types`: Contact, InviteToken, ContactStatus types.
   - `@myorg/utils`: pure invite-link helpers (create/parse/validate), string guards.
2. Add unit tests for these pure helpers in existing test style.
3. Replace equivalent duplicated logic in legacy contacts code with package imports where low-risk.
4. Ensure package exports are explicit (`index.ts` only).
5. Run:
   - `pnpm build:mono -- --filter=@myorg/types --filter=@myorg/utils`
   - targeted tests you add.

Deliverables:
- New/updated shared types and utils.
- No behavior regressions.
- Clear changelog summary.

Acceptance criteria:
- Types/utils compile independently.
- Contacts link/token helper logic is centralized and tested.
- No UI migration in this step.
