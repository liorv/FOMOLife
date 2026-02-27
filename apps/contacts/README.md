# contacts

Independent Next.js App Router app for the Contacts tab domain.

## Current state

- Contacts UI is migrated into `components/` using CSS Modules only.
- No dependency on legacy `src/App.css`.
- Contacts data flow goes through `app/api/contacts` via a typed client adapter.
- Auth boundary is controlled by `CONTACTS_AUTH_MODE` and cookie `contacts_session`.

## Commands

- `pnpm --filter contacts dev`
- `pnpm --filter contacts build`
- `pnpm --filter contacts typecheck`

## Deployment

- Vercel root directory: `apps/contacts`
- App-scoped config: `apps/contacts/vercel.json`
