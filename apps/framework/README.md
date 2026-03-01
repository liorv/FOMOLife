# framework

Independent Next.js App Router app that hosts the migrated Contacts, Projects, and Tasks apps.

## Current state

- Provides shared framework shell UI: logo bar, navbar tabs, and content menu.
- Hosts extracted apps in an embedded content area and switches by active tab.
- Preserves legacy `?tab=` compatibility (`dreams` maps to `tasks`).

## Commands

- `pnpm --filter framework dev`
- `pnpm --filter framework build`
- `pnpm --filter framework lint`
- `pnpm --filter framework test`

## Deployment

- Vercel root directory: `apps/framework`
- App-scoped config: `apps/framework/vercel.json`

## Auth modes

- `FRAMEWORK_AUTH_MODE=none` — bypass login and auto-enter app.
- `FRAMEWORK_AUTH_MODE=mock-cookie` — simple local user ID form login.
- `FRAMEWORK_AUTH_MODE=supabase-google` — Google OAuth via Supabase (recommended for production).

For `supabase-google`, set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
