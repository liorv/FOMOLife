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

In a project's Plan view, the navbar's Add dependency button asks you to select
a task, then select what it depends on. Cancel or Escape exits without saving.
The existing graph and table dependency actions remain available.

In a project's Roadmap view, the navbar's upward chevron expands Add Milestone
(star with a plus) and Add Deadline (black-and-white checkered flag with a plus).
The chevron points down while expanded. Hover or focus a FAB to
see its label. Add Milestone asks you to select a task by clicking its roadmap
bar, without opening a separate task list. The Milestones table
and Deadlines table each have an Add button at the top right beside Clear,
using the same flows as the navbar FABs. The Milestones table
below the roadmap lets you rename milestones and add or remove task dependencies.
A yellow star marks the latest forecast finish among each milestone's linked
tasks, with its name below. Deleted dependencies are labeled in the table and
must be replaced or removed before that milestone can be plotted.

Add Deadline asks for a name and a calendar date, without linking a task.
Deadlines appear as labeled checkered flags with black dotted vertical date
lines through the roadmap, and in an editable Deadlines
table. The timeline includes deadlines before today or beyond the task forecast.
Milestones and deadlines are saved with the project. Clear Milestones and Clear
Deadlines have blue backgrounds, sit above their respective tables, and ask for confirmation; neither
operation deletes tasks or Plan dependencies.

The document canvas and PWA launch background are black; app content keeps its
existing light/dark backgrounds. This is a best-effort backdrop for Android
system navigation, whose final appearance is controlled by the browser and OS.

Manually switching tabs (including mobile swipes) clears the global search input
and its URL query. Direct links can still open a tab with a search query.

Tasks are managed inside the project editor, in the project-level tasks panel
or a subproject. There is no standalone Tasks tab.

In Edit Project Overview, attach an optional HTTP/HTTPS URL using External Link.
It saves when the field loses focus (or you press Enter). A small link icon beside
the project name on its tile and in the editor opens the URL in a new tab.
Clear the field to remove the link. Project exports include the saved link.
Project tiles use a sliding action tray like Home tasks in Cards, List, and Compact
views. Click or tap the grid-and-chevron handle at the far right of a tile to
slide the actions open to the left. The handle stays visible and its chevron
points right when open; activate it again to close the actions. Keyboard users
can focus the handle and press Enter or Space. Hovering or focusing a tile no
longer opens its actions automatically.
The handle and action tray both use three columns and two rows. Icons and
single-line labels scale down in narrow trays. Delete confirmation shares its
action cell and temporarily expands short tiles to preserve usable buttons
without a scrolling action tray.
The project icon stays at the left edge, vertically centered before the title,
with space reserved so the sliding actions cannot cover it.
A dismissible left-arrow hint above the tiles explains "Swipe left for actions";
dismissing it remembers the choice on that browser.
On mobile, swipe left or right on a closed tile to reveal them; swipe right again,
tap the tile or elsewhere, or press Escape to dismiss. Horizontal swipes do not
change the active app tab. The old floating hover menu and More options dropdown
are replaced by direct Edit, Rename, Color, Add/Edit link, Complete/Restore, and
Delete/Leave actions, as applicable.
For a project without a link, choose Add link from the tray.
For a project with a link, choose Edit link to update the prefilled URL.
In the dialog, paste the URL and choose Save link
to attach it directly without opening the overview.
Cancel, Escape, or clicking outside the dialog closes it without saving.

Checkboxes update immediately. Project saves are queued per project in click
order, and earlier save responses cannot replace newer pending edits. Save
failures are displayed in the projects page rather than silently ignored.
Successful saves also update the session cache, including recurring-task due
dates, so reloading does not first restore an older task date.
Pending task edits and deletions update the session cache immediately and remain
marked stale across reloads until saved. Project reloads bypass HTTP caching to
reconcile with the server rather than restore a previously fetched task list.
Open task editors follow updated task values, including due dates advanced by
recurring completion. Field edits save directly; closing or deleting an editor
does not save an old task snapshot or restore a deleted task.

Task checkboxes use a 24px box inside a 44px press target, including compact
project and filtered task rows. Completing a recurring task keeps it open and
advances its due date by one recurrence interval from its last due date, not from
the completion date or original anchor. Overdue occurrences are not skipped;
each check advances one occurrence, even when completing early or repeatedly.
Undated recurring tasks start from the completion date. Monthly and yearly
recurrences retain their original day when clamping to shorter months.

Dragging projects into a new order saves that order and restores it after a
reload or returning to the Projects tab. Projects without a saved position appear
after ordered projects, preserving their existing relative order.

### Project planning (optional view)

Open a project and choose **Tasks**, **Plan**, or **Roadmap**. Tasks remains the default;
opening a task from a notification returns to the normal task editor.

Plan uses the same project header as Tasks. **Dependency Graph** appears
above **Dependency Table**; there is no separate Sequence/Map switch.
Solid arrows are task-to-task requirements; dashed arrows are advisory section
planning hints. Curved connectors land horizontally with compact arrowheads
that keep their size when selected. The table lists prerequisites in a **Depends on**
column, with an **Add link** icon on each row and removal controls beside each link.
Dependency warnings expand on demand. There is no duplicate link list below
the map.
Selected graph links use the theme pink without a rectangular focus outline.
Managers can use **Clear dependencies** above the table to remove all task
requirements and section hints after confirmation; tasks and sections are kept.

Click a row's **Add dependency**, then **Select what it depends on** in the
table or map. The dependent stays highlighted while you choose its prerequisite.
The relationship appears in the map and table instantly while it saves in the
background; a snackbar shows **Saving…** and then confirms **Saved**. Changes
save in order, and a failed save is undone with a dismissible error.
Click a graph node to reveal **Add dependency**, then choose its prerequisite
in the graph or table. Click an arrow to reveal **Remove dependency**; removal
only happens after confirming with that button. Graph arrows also support
keyboard activation. Contextual actions appear in the project header with
Material icons, replacing members and Invite while viewing Plan. Selected nodes
and arrows are highlighted blue; other arrows are black. Use the scroll wheel
over the graph to zoom (50–200%) around the pointer, without scrolling the page.
There is no separate zoom selector.
Completed tasks show a small green checkmark beside their
name in both the graph and table.
Section nodes use a double border in the graph to distinguish them from tasks.
Select a task in the graph or table, then choose **Edit** in the header to expand
the existing task editor in its table row. Edits use the same project save path
as Tasks and update the forecast when opening Roadmap. Owners can only be chosen
from project members; the server also rejects assigning anyone else.
Static graph hints are hidden; a scroll-to-zoom graphic appears on hover or focus.

The separate **Roadmap** tab is a forecast, not saved scheduling. Summary cards
show expected completion, remaining sized effort in days, and the number of
unsized tasks. The completion forecast includes the one-day estimates for unsized
tasks; those estimates are not added to the sized-effort total. It starts
today, uses one calendar day per effort unit, and starts tasks after their
prerequisites finish; independent tasks run in parallel. Tasks without effort
use one day, marked with a dashed bar and `~1d`. Completed tasks are hidden and
do not delay future work. Recurring tasks represent their current
occurrence, not an infinite series. Section hints are expanded to their member
tasks for the forecast; contradictory section/task constraints show a scheduling
error rather than invented dates. Existing due dates are unchanged. Assigned
people show their contact/member photos, falling back to initials when unavailable.
Dependency chains share roadmap lanes, with each task starting after all its
prerequisites finish. Parallel branches use separate lanes. Task labels appear
under bars, and assignee photos sit inside the bar on its left, before the effort. Header **Edit**
scrolls to the expanded editor, including when that task is already expanded.
Zero-effort tasks stay in their dependency-chain lane; coincident
milestones stagger their annotations so they remain readable. Consecutive bars
have different colors, and effort is always inside the bar. **Across project**
shows project dependency chains; **By person** groups the same forecast by assignee,
including an Unassigned group. Shared tasks appear under each assignee without
double-counting project totals. Person grouping does not change dates or
introduce resource-capacity scheduling.
Click a roadmap bar to highlight it (amber ring) and show **Edit** and **Add
dependency** in the project header. **Edit** expands the task editor in place
beneath that bar's row, spanning the full roadmap width. **Add dependency** prompts you to click another bar as
the prerequisite; it saves through the same plan path as the Plan tab and
rejects self-links, duplicates, and cycles. Like the Plan tab, the new link
appears immediately and is confirmed once saved. Escape cancels prerequisite
selection or clears the highlighted bar. Read-only members see static bars.

Switching between Tasks, Plan, and Roadmap slides the content below the header
toward the chosen tab (left for later tabs, right for earlier ones); the header
stays still. Motion is disabled under `prefers-reduced-motion`. All three views
use the same gap between the header tile and their content.
Edit aligns the task's title row with space above the editor, without a smooth
scroll that can overshoot as the table expands.
Use **Cancel** or Escape to leave selection without saving.
Empty sections can be linked before their work is broken down.
All tasks and sections remain visible in the table, including unlinked items.

This first version is deliberately isolated: task requirements are **not enforced**
by checkboxes. There are no completion/reopening cascades, new Home panels,
automatic deadline changes, or scheduled work dates. Dependencies express
precedence, not urgency or duration.

Links stay within one project. Recurring tasks cannot be endpoints of task-to-task
requirements, but may participate in section-related hints. Section progress
excludes recurring tasks; empty sections are shown as not broken down rather
than complete. Warnings flag deadline inversions and incomplete section timing.

Links save separately from task edits and failures are shown in Plan. They use the
existing project persistence model, not new cross-session transactional guarantees.
Plan structure is copied with fresh identities when using a template. Legacy task
JSON import/export does not transfer dependency links.
Existing task deletion, section promotion, and recurrence editing are unchanged:
links that become invalid remain visible inline (or under **Missing items** if
their dependent was deleted) for explicit removal. They are never treated as
satisfied prerequisites.

### Project templates

The project editor keeps collaboration and task filters in a compact toolbar.
Use **View** to show completed tasks or expand/collapse all sections. **More**
contains the project overview, JSON import/export, template conversion, and
completion/archive actions. Filter and Chat remain available while filtering.
View and More expand options below the toolbar instead of opening overlay menus.
The open control is highlighted; tap it again, use the panel's close button, or
press Escape to dismiss its options. Options fit a single row without scrolling;
on smaller screens, icons sit above wrapping labels. The header's rounded Invite button opens
the project invitation dialog. **Leave project** is at the bottom of the project
overview and requires a second click to confirm.

In Projects, switch to **Templates** to browse reusable workflows, or choose
**New template** to build one from scratch using the regular project editor.
The toolbar shows **New project** in Projects and **New template** in Templates.
On mobile, the Projects/Templates selector spans the first row, with layout
controls and the current tab's creation button below it.
Open any existing project and choose **Convert to template** to move it into the
library. Conversion keeps its content and members, removes its archived status,
and can be reversed with **Convert to project**.

Choose **Use template**, enter a project name, and select **Create project**.
The new project copies the template's subprojects, tasks, colors, notes, goal,
external link, icon, and AI instructions. It gets fresh project/subproject/task
IDs; tasks start incomplete, with fresh creation timestamps and no previous due
dates, recurrence anchors, or assignments. Recurrence settings, favorites, and
effort estimates are kept. Only the current user is added as a member.
The template is unchanged, and later edits to either copy do not affect the other.

Templates are excluded from Home task panels/activity and due-date reminders.
Editing their tasks does not send completion or assignment notifications.
Global project search labels templates separately and opens their editor.
Creating from a template requires access to it; inaccessible and non-template
source IDs are rejected by the API.

Home's Recent Activity lists task creation and completion events by their recorded
timestamps, newest first, within the last seven days. Due dates never determine
task activity order or inclusion. Task timestamps are saved for both standalone
and project tasks; reopening a task clears its completion timestamp. Legacy tasks
without a recorded timestamp do not receive a guessed activity date.
Contact creation, established connections, and new projects also use persisted
timestamps, never generated dates. Linking records the connection date; unlinking
clears it. Existing contacts, connections, and projects with unknown dates are
omitted, and equally dated activity has a stable order across refreshes.

Home task rows in Favorites, Overdue, and Coming Due reveal
actions when swiped left. Swiping right with the actions open only closes them.
A fresh right swipe asks "Mark as done?" on the row; choose Confirm to complete
the task or Cancel to leave it unchanged. Tapping the row or outside it, or
pressing Escape, also dismisses the confirmation. The Done action button still
completes the task directly.

Notification links open the framework host at `/`, not the analytics dashboard.
Chat notifications include a `threadId` (or `feedbackId`) and open that conversation
after its data loads. Task completion, assignment, and due-date notifications
include a `taskId` and open the task editor; project tasks also include `projectId`.
The bell dropdown and device push notifications use the same destination links.
The bell count and dropdown share a prefetched notification list that stays loaded
across app tab switches and dropdown openings. Opening the bell or returning to
the browser tab refreshes it without hiding existing items. The empty state appears
only after every notification source finishes loading; failed loads show an error.
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
- Open the notification bell, select the **Notification settings** gear in the
  panel header, then expand **Browser & mobile**,
  select **Enable on this device**, and allow notifications. Repeat in each desktop browser and installed
  mobile app. **Send test** checks delivery to registered devices.
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
- **Notification settings** has independent switches for tasks you complete,
  tasks others complete, task assignments, project comments, task comments,
  feedback comments, and feedback status changes, alongside due-date reminders.
  Preferences save automatically per account and apply to both the bell and
  device push. All categories remain enabled by default for existing users.
  Disabled categories are hidden from the bell and its unread count immediately;
  existing stored notifications reappear if re-enabled. Activity notifications
  skipped while disabled are not backfilled. Contact requests are unaffected.

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
