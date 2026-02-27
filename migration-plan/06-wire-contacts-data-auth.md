# STEP-06 — Wire contacts data + auth boundaries

## Goal
Connect `apps/contacts` to data/auth cleanly without app-to-app coupling.

## Prompt for LLM
Implement data/auth wiring for contacts app with strict domain boundaries.

Constraints:
- No imports from legacy app internals.
- Server-only code must stay server-only.
- Env vars validated at app boundary.

Tasks:
1. Define `@myorg/api-client` contracts for contacts operations.
2. Implement contacts app adapters for:
   - loading contacts
   - invite generation flow
   - update/delete contacts
3. Integrate auth context or session checks at app boundary.
4. Add explicit server/client separation (`server-only` where needed).
5. Add simple env validation for contacts app.
6. Run:
   - `pnpm --filter contacts typecheck`
   - `pnpm --filter contacts build`
   - relevant tests

Acceptance criteria:
- Contacts app handles its own data/auth flow.
- Clear boundaries between client/server modules.
- No secrets leaked to client bundles.
