# Vercel Projects Setup (Monorepo)

This repo deploys each app as an independent Vercel project.

## Project naming convention (required)

Use this format for all app projects:

- `fomo-life-{appname}`

Examples:

- `fomo-life-contacts`
- `fomo-life-projects`
- `fomo-life-tasks`

## Contacts project (current app)

Create one Vercel project with these settings:

- Project name: `fomo-life-contacts`
- Root Directory: `apps/contacts`
- Framework Preset: `Next.js`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm --filter contacts build`
- Output Directory: _(leave default for Next.js)_
- Node.js Version: use Vercel default for your Next version

## Environment variables (contacts project only)

Set these in Vercel project settings:

- `NEXT_PUBLIC_APP_NAME=FOMO Life Contacts`
- `CONTACTS_AUTH_MODE=none` (or `mock-cookie`)
- `CONTACTS_DEFAULT_USER_ID=local-user`

Notes:

- Keep these env vars isolated to `fomo-life-contacts`; do not share with future apps unless intended.
- `NEXT_PUBLIC_*` vars are exposed client-side; do not place secrets there.
- For `mock-cookie` auth mode, requests require `contacts_session` cookie.

## Domain mapping

Recommended:

- Production: `contacts.your-domain.com`
- Preview: Vercel default preview domain per branch

Alternative single-domain path strategy:

- Use reverse proxy at edge to map `/contacts` to contacts project.
- Keep direct project domain available for debugging.

## Local commands mirroring Vercel

From repo root:

- `pnpm install --frozen-lockfile`
- `pnpm --filter contacts typecheck`
- `pnpm --filter contacts build`

Optional filtered turbo parity:

- `pnpm turbo build --filter=contacts`

## Manual project creation steps (UI)

1. Vercel Dashboard → Add New Project.
2. Select this Git repository.
3. Set Root Directory to `apps/contacts`.
4. Set Install/Build commands as above.
5. Add env vars for Preview + Production.
6. Deploy.

## CLI alternative

From repository root:

1. `vercel link` (choose/create project `fomo-life-contacts`).
2. `vercel --prod`.
3. In project settings, confirm root dir is `apps/contacts`.

If root dir is not configurable from your current CLI flow, use the dashboard once and then continue via CLI.
