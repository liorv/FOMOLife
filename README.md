# FOMO Life Monorepo

This repository is fully migrated to a multi-app monorepo architecture.

## Architecture

Apps:
- `root` — framework host app (logo bar, navbar, content menu, hosted tabs)
- `apps/contacts` — contacts management app
- `apps/projects` — projects app

Shared packages:
- `packages/types` — shared domain contracts
- `packages/utils` — shared utilities
- `packages/api-client` — shared API client wrappers
- `packages/ui` — shared UI primitives (for future consolidation)

Boundary rule:
- Apps do not import from other apps.
- Cross-app sharing happens only through `packages/*` exports.

## Production URLs

Canonical app URLs:
- Framework host: https://fomo-life.vercel.app
- Contacts: https://fomo-life-contacts.vercel.app
- Projects: https://fomo-life-projects.vercel.app

Legacy compatibility redirects (handled by framework host shell):
- `https://fomo-life.vercel.app/?tab=people` → contacts app
- `https://fomo-life.vercel.app/?tab=projects` → projects app

## Task editing

Tasks are managed inside the project editor, in the project-level tasks panel
or a subproject. There is no standalone Tasks tab.

Checkboxes update immediately. Project saves are queued per project in click
order, and earlier save responses cannot replace newer pending edits. Save
failures are displayed in the projects page rather than silently ignored.

Notification links open the framework host at `/`, not the analytics dashboard.
Chat notifications include a `threadId` (or `feedbackId`) and open that conversation
after its data loads. Task completion, assignment, and due-date notifications
include a `taskId` and open the task editor; project tasks also include `projectId`.
The bell dropdown and device push notifications use the same destination links.
Test notifications and notifications without a destination open Home (`/`).
The service worker redirects old analytics notification links to the framework
host while preserving any tab, conversation, or task context in their query.

New chat messages notify the creator and all previous commenters in that
conversation, excluding the sender and deduplicating recipients. Task chats
also notify assigned project members, even before they have commented.
Project tasks use the project's creator (or legacy owner) as their creator.

## Local development runbook

Prerequisites:
- Node.js 20+
- `pnpm` (workspace package manager)

Install:
- `pnpm install --frozen-lockfile`

Run all apps (Turbo):
- `pnpm dev:mono`

Run a single app:
- `pnpm --filter framework dev`
- `pnpm --filter contacts dev`
- `pnpm --filter projects dev`

## Git safety guardrails (large/generated files)

This repo blocks committing and pushing generated/cache artifacts and oversized files.

One-time local setup:
- `pnpm setup:githooks`

Checks:
- Pre-commit blocks staged cache/generated files and files larger than 5MB.
- Pre-push blocks pushed commits that contain cache/generated files or files larger than 5MB.
- CI also runs `npm run check:large-files` on every push/PR.

Validation gates:
- `pnpm turbo lint --filter=framework --filter=contacts --filter=projects`
- `pnpm turbo build --filter=framework --filter=contacts --filter=projects`

## Deployment runbook (preview + production)

All projects deploy independently on Vercel.

Recommended release flow:
1. Merge approved changes to `main`.
2. Run local/CI validation gates.
3. Trigger production deploy per project:
  - `vercel link --project fomo-life --yes; vercel --prod --yes`
   - `vercel link --project fomo-life-contacts --yes && vercel --prod --yes`
   - `vercel link --project fomo-life-projects --yes && vercel --prod --yes`
4. Verify aliases are live and healthy.

Notes:
- Root project `vercel.json` uses `pnpm install --frozen-lockfile` to support workspace deps.
- Each app has isolated runtime env and auth mode settings.

## Environment variable management

### Browser and installed mobile notifications

- Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` on the deployed
  framework app. Generate a pair with `pnpm exec web-push generate-vapid-keys`.
  Keep the private key secret and the key pair stable across deployments. The
  browser retrieves the public key at runtime; a separate build-time public key
  is not required.
- Open the profile menu's **Notification settings**, select **Enable on this
  device**, and allow notifications. Repeat in each desktop browser and installed
  mobile app. **Send test notification** checks delivery to registered devices.
- On iPhone/iPad, use iOS/iPadOS 16.4 or later, add the app to the Home Screen,
  then open that installed app and enable notifications from there.
- Push delivery does not depend on an open FOMO Life tab. Browser/OS notification
  permissions, background delivery settings, connectivity, and Focus modes still
  apply; installation alone does not grant permission.
- The existing daily `/api/tasks/cron` schedule runs at **13:00 UTC**. It scans
  standalone and shared-project tasks using each recipient's reminder preferences.
  Reminder choices are calendar-day milestones, not exact due-time alarms.
  Configure `CRON_SECRET` for the scheduler's `Authorization: Bearer ...` header.
  Inspect cron responses (`usersScanned`, `notified`) and server logs if reminders
  are absent. `notified` counts stored reminders, not confirmed device deliveries.
- Completion notifications are sent when a task changes from incomplete to
  complete (not by the daily cron), including to the completer's registered devices.
  Shared project completions also notify the project's other members.

Cross-app URL vars (set where relevant):
- `NEXT_PUBLIC_CONTACTS_APP_URL`
- `NEXT_PUBLIC_PROJECTS_APP_URL`
- `NEXT_PUBLIC_TASKS_APP_URL`

Per-app auth/runtime vars:
- Framework: `FRAMEWORK_AUTH_MODE`, `FRAMEWORK_DEFAULT_USER_ID`
- Contacts: `CONTACTS_AUTH_MODE`, `CONTACTS_DEFAULT_USER_ID`
- Projects: `PROJECTS_AUTH_MODE`, `PROJECTS_DEFAULT_USER_ID`
- Tasks: `TASKS_AUTH_MODE`, `TASKS_DEFAULT_USER_ID`

Useful commands:
- `vercel env ls production`
- `vercel env add <NAME> production --value "<VALUE>" --force --yes`

Important:
- `NEXT_PUBLIC_*` variables are public at runtime.
- Never store secrets in `NEXT_PUBLIC_*` variables.

## Rollback and incident response

If a production issue is detected:
1. Identify impacted app(s) and deployment URL in Vercel.
2. Roll back alias to a previous healthy deployment from Vercel dashboard.
3. Confirm health:
   - app home page returns expected UI
   - app API endpoint returns 200 (`/api/contacts`, `/api/projects`, `/api/tasks`)
   - root legacy tab redirects still resolve correctly
4. If issue is root shell only, prioritize restoring redirect continuity from `/?tab=...` URLs.
5. Create follow-up fix and redeploy with the same validation gates.

## Migration parity evidence (final)

Build/test evidence:
- `pnpm turbo lint --filter=contacts --filter=projects --filter=tasks` passed
- `pnpm turbo test --filter=contacts --filter=projects --filter=tasks` passed
- `pnpm turbo build --filter=contacts --filter=projects --filter=tasks` passed

Production smoke evidence:
- Contacts/Projects/Tasks pages load and show expected primary controls.
- API endpoints are healthy:
  - `https://fomo-life-contacts.vercel.app/api/contacts`
  - `https://fomo-life-projects.vercel.app/api/projects`
  - `https://fomo-life-tasks.vercel.app/api/tasks`
- Legacy root tab redirects verified:
  - `projects`, `tasks`, `people`, `dreams` all resolve to expected app URLs.

Known limitations:
- No dedicated Playwright/Cypress E2E suite is currently checked into this repository.
- Smoke parity was validated via scripted browser checks and manual sanity confirmation.

## Migration plan status

Migration execution is complete.
See:
- `migration-plan/STATE.json`
- `migration-plan/README.md`
- `migration-plan/VERCEL_PROJECTS.md`
