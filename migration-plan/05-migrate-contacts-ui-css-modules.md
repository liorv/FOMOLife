# STEP-05 — Migrate contacts UI + isolate CSS Modules

## Goal
Move Contacts UI into `apps/contacts` and stop depending on giant global CSS for this feature.

## Prompt for LLM
Execute only Contacts UI migration.

Constraints:
- Use CSS Modules for new Contacts components.
- Do not import legacy giant `src/App.css` into `apps/contacts`.
- Keep visual behavior close enough to current contacts UX.

Tasks:
1. Copy/migrate Contacts-related UI components from legacy app to `apps/contacts/components`.
2. Convert styling into component-level `*.module.css` files.
3. Keep only minimal `app/globals.css` in contacts app.
4. If shared primitives are needed, move to `@myorg/ui` first, then import from package.
5. Add/adjust tests for migrated contacts components where practical.
6. Run:
   - `pnpm --filter contacts typecheck`
   - `pnpm --filter contacts build`

Acceptance criteria:
- Contacts app renders migrated UI.
- Contacts styles are isolated (module-based).
- No new dependence on legacy global CSS.
