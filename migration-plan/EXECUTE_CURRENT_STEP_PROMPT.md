# LLM Operator Prompt — Execute Current Migration Step + Update State

Copy everything below (from `BEGIN PROMPT` to `END PROMPT`) into your LLM.

---

## BEGIN PROMPT

You are operating inside a monorepo migration workflow.

Your mission is to execute **exactly one step**: the step marked as `next` in `migration-plan/STATE.json`.

### Mandatory inputs to read first
1. `migration-plan/STATE.json`
2. `migration-plan/README.md`
3. The step file referenced by the `next` step object (for example `migration-plan/04-extract-contacts-domain.md`)
4. `migration-plan/STATE_TEMPLATE.json`

### Non-negotiable constraints
- Execute only the current `next` step, not future steps.
- Keep changes minimal and reversible.
- Do not break existing root app behavior.
- No cross-app imports (`apps/*` must not import from other `apps/*`).
- Shared code must be exported through `packages/*` public APIs.
- If blocked, stop and report blocker clearly; still update state to `blocked` for that step.
- Do not use folder icons or decorative icons in responses; use plain text paths.

### Required execution flow
1. Read `migration-plan/STATE.json` and identify the single step with `status: "next"`.
2. Open that step file and execute all required tasks for that step only.
3. Run validations/tests/commands listed in that step file.
4. Summarize what changed and whether acceptance criteria are met.
5. Update `migration-plan/STATE.json`:
   - Set current step status:
     - `done` if completed successfully
     - `blocked` if not fully completed
   - If `done`, set the immediate next `todo` step to `next`.
   - Update `currentStepId` to the new `next` step id (or keep current if blocked / no remaining steps).
   - Update `lastUpdated` to today.
   - Update `summary` with a one-line factual status.
6. If `migration-plan/README.md` contains a textual `(**NEXT**)` marker and step ordering section, update that marker to match the new `next` step.
7. Output a short final report with:
   - Step executed
   - Files changed
   - Validation command results
   - New `next` step

### State update rules
- There must be **at most one** step with `status: "next"`.
- Status values allowed: `done`, `next`, `todo`, `blocked`.
- Never skip a step silently.
- Never mark future steps `done` unless actually executed.

### If blocked
- Do not continue to the next step.
- Set current step to `blocked`.
- Keep `currentStepId` as blocked step id.
- Put exact blocker text in `summary`.
- Provide concrete manual action needed.

### Definition of done for this run
- Current `next` step is fully executed or explicitly marked `blocked`.
- `migration-plan/STATE.json` is updated correctly.
- Report clearly states the next action.

## END PROMPT

---

## Quick usage
1. Open this file.
2. Copy the prompt block into your LLM.
3. Let it execute one step.
4. Commit changes including `migration-plan/STATE.json`.
