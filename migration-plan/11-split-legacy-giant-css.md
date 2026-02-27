# STEP-11 — Split legacy giant CSS safely

## Goal
Reduce maintenance burden of `src/App.css` while preserving legacy behavior during migration.

## Prompt for LLM
Refactor legacy giant CSS into smaller domain files without changing runtime behavior.

Constraints:
- No visual redesign.
- Keep selector behavior stable.
- Migrate incrementally by domain section.

Tasks:
1. Split `src/App.css` into domain files (example):
   - `src/styles/layout.css`
   - `src/styles/tabs.css`
   - `src/styles/projects.css`
   - `src/styles/contacts.css`
2. Keep import order deterministic via a single aggregator file.
3. Preserve existing custom properties and responsive sections.
4. Run targeted UI smoke checks and existing tests.

Acceptance criteria:
- Smaller CSS files are easier to review.
- No known visual regressions.
- Future tab extractions can retire legacy CSS slices cleanly.
