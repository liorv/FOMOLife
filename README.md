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

### Optional project management

Projects start with Tasks only. Enable **Project management** using the switch in
the Tasks action bar beneath the project header tile. This per-project setting is
saved for all project members. **Manage** then groups **Plan**, **Roadmap**,
**Risks**, and **Status** as subsections. Return to Tasks to disable the switch;
disabling hides Manage without deleting its data. Read-only users cannot change
the setting. Projects created from templates inherit the template's setting.

### Shareable project URLs

Opening a project or selecting Tasks, Plan, Roadmap, Risks, or Status updates the browser
URL. Copy the address to share the same view with another project member:

- `/?tab=projects&projectId=<id>` opens Tasks.
- `/?tab=projects&projectId=<id>&view=plan` opens Plan (also `roadmap`, `risks`, or `status`).
- `/?tab=projects&projectId=<id>&subprojectId=<section-id>` expands and scrolls
  to a task section.

Links use stable IDs, survive reloads, and support browser Back/Forward.
Signed-out visitors return to the destination after signing in. Links do not
grant access: the signed-in user's existing project permissions still apply.
Deleted or inaccessible targets display an availability message.
Management links open Tasks instead when project management is disabled.

In a project's Plan, Roadmap, Risks, or Status view, the navbar thumb opens a help
dialog explaining the current page and how to use it. The thumb no longer
starts dependency selection or opens Roadmap actions; dependency and deadline
controls remain available in their respective pages.

The Status view groups completed and ready-to-start tasks by section. Only explicit
task-to-task prerequisites control eligibility; section planning hints do not.
Work states are Not Started, Blocked, In Progress, and Complete, with colored SVG
icon badges (not rasterized icon fonts). Complete synchronizes with task completion everywhere; choosing another
status reopens a completed task. Completing recurring work advances its next occurrence
as usual and resets its status to Not Started. New projects instantiated from templates
do not inherit task statuses, schedule health, update bullets, or status history.

Schedule health is separate from work state: active (In Progress or Blocked),
ready-to-start tasks can report On track or Behind. New active tasks default to
On track. Legacy On track work statuses are interpreted as In Progress + On track.
The schedule control is an animated sliding switch: Behind on the left, On track
on the right (the default). Click or press Space/Enter to toggle, or use Left/Right
to choose a side. Reduced-motion preferences disable the slide animation.
Behind propagates through explicit task requirements to all unfinished dependent
tasks without changing their work status. The inherited flag is calculated, never
saved as the dependent's own assessment; it clears when upstream work recovers or
is completed. Completed work stops propagation; section hints do not propagate health.
Future tasks cannot manually report health. The project summary and projected impact
include inherited delays even when those future tasks are hidden by the ready-work filter.

Select a task row (or use Enter/Space) to add text-only update bullets in the Updates
column, just like risk mitigations: Enter saves, X removes, and blur/Escape discards
the unsaved draft. Unselected, read-only, and historical rows show plain text.
Updates have no individual status or timestamp; each daily snapshot preserves the
task's current notes, status, and effective health together. Notes and schedule health
are exported/imported with tasks; new template instances and recurring occurrences
start with no reporting notes or health.

The overall report includes every project task: all complete means Complete; otherwise
it shows Behind when work is blocked, reported behind, or forecast past a project deadline.
Started projects without those issues show On track; untouched projects show Not started.
Reported blockers and delays flag downstream tasks and milestones through task requirements.
Finish and deadline estimates use remaining effort and explicitly entered delays, as described below.

Each task status/completion change saves a server-generated snapshot with all task
and section labels, statuses, eligibility, overall status, impact, updater, and time.
Today's snapshot updates automatically whenever reporting data changes. Status history has one row per
UTC date: another update on that date replaces the row without modifying earlier dates.
Select a date to examine its read-only report. History is stored with the project using
the existing storage provider; no separate database migration is required.
Expand a date's Task history to see every task (including tasks waiting on prerequisites),
its section, work state, effective schedule health, and full note list. Changes are
compared with the previous recorded snapshot: status/health transitions, added/removed
tasks, renamed/moved tasks, and added/edited/removed notes. Removed tasks retain their
last recorded state. First-snapshot notes are only known to exist by that date; legacy
snapshots without notes are labeled as such, not treated as empty. This remains daily
history, not an event log: same-day changes are consolidated, so intermediate changes
or notes added and removed within the same date cannot be reconstructed.
Task statuses are included in JSON exports/imports (history is not imported into
another project). API clients change an existing task's reporting status through
`taskStatusUpdate: { taskId, status }`, `taskScheduleUpdate: { taskId, health }`,
`taskDelayUpdate: { taskId, days }`, or
`taskStatusNote: { taskId, action: 'add', update: { id, text } }` / `{ taskId,
action: 'remove', updateId }`. Send one reporting action per request. Ordinary full-task
saves preserve the latest reporting status, health, delay days, and notes while still synchronizing completion. This prevents stale editor
snapshots from overwriting newer status reports.
Status changes update the task, project summary, and impact immediately while saving.
Work-state changes and removals are disabled for a task while saving; schedule
switches and new bullet entry remain responsive. Failed writes show
an error and roll back the failed change. History is displayed only after persistence
succeeds. Reporting-only updates skip Roadmap notification scans; completion changes
still deliver task and milestone notifications.

The Status overview shows one headline, completed/total task counts, and a short list
of blocked or behind tasks. Dependent work is collapsed under an affected-task count;
the forecast shows earliest finish and deadline comparisons. Schedule switches
remain interactive while saving: changes are applied immediately and persisted in order.
Update entry stays focused and empty after Enter, ready for the next bullet without
waiting for the previous save. Pending bullets are kept in order and failed writes
roll back only the failed change.

Status uses Material-style tonal cards, rounded table surfaces, and colored status chips.
The completion bar remains only in the project header, not duplicated in Status.
Selected rows and keyboard focus remain visible;
dark mode and reduced-motion preferences are supported. Tables scroll horizontally
on smaller screens without compressing task controls.

The overall live report and dated history show schedule health (On track / Behind),
not the project's work-state badge. Not started and Complete remain distinct endpoints.
Behind uses red rather than orange. Task-history tables wrap within the page and
stack their cells on narrow screens instead of requiring horizontal scrolling.

Status forecasting interprets existing effort as remaining calendar days from the
snapshot's UTC date. Explicit task prerequisites determine the critical path;
independent tasks run in parallel, completed tasks take no time, recurring work is
excluded, and section planning hints are ignored. Report active-task delay days
under the Behind switch. Delays extend that task's duration; the project added delay
is the difference between critical-path finishes with and without reported delays,
not the sum across parallel tasks. Switching to On track excludes that task's delay.
The report compares the earliest finish with every project deadline and shows days
late. Missing effort or invalid prerequisite graphs leave the finish unestimated.
These are optimistic forecasts, not capacity-aware commitments: update effort as
remaining work changes. Each snapshot freezes its forecast and delay inputs.

In a project's Risks stage, the Risk Management table uses the Plan table's
section/task layout. Dependency, risk, and milestone tables use the same small
green checkmark to the left of completed task names (not section names).
Add one or more risks to each task, with a name, description,
and any number of text mitigations. The segmented control beside Risk Management defaults
to All; choose Mitigated or Unmitigated to show only matching risks and their
tasks and sections. Tasks without risks appear only under All. Filtering does
not change saved risks. Unselected rows display plain text without
tags or risk/mitigation buttons. Hover a risk name for two seconds
to show its description (also available on keyboard focus). Click a task or risk
row (or focus it and press Enter/Space) to turn its risks and mitigations into
clickable edit tags with removal Xs. A name field below the task's last risk and
a mitigation field in the selected risk's mitigation column save on Enter.
The new-risk field has its own neutral row below existing risks; when the task
has no risks, it replaces No Risks in the existing row instead. Entry prompts
read "What is the risk?" and "How will we mitigate the risk?" with no add buttons.
Clicking or tabbing out of an add field discards its draft.
Unmitigated risks have a light red background; mitigated risks have light green.
Clicking outside restores plain text and discards an
unsaved inline mitigation draft; the risk modal remains usable while open.
Clicking a task name opens only its task editor.
Rows have no persistent add buttons or extra action rows.
The Add Risk modal contains only the name and description. Mitigations appear in
a separate column aligned with each risk; each bullet has an X to remove it.
The selected row's Add mitigation action opens an inline bullet editor. Enter or Save mitigation saves
the bullet, and Escape or Cancel discards it. The existing-risk editor lets you rename the risk,
update its description, or add, change, and remove mitigations. A risk without mitigations
is Unmitigated; adding a mitigation makes it Mitigated, and removing the last one
returns it to Unmitigated. Cancel discards the current risk draft.
Risks are saved with tasks, included in project exports/imports and templates,
and move or are deleted with their task. Read-only projects show risks without
editing controls.

In a project's Roadmap view, the navbar's upward chevron expands Add Deadline
(black-and-white checkered flag with a plus).
Tasks with unmitigated risks have a red-outlined bar with a small red exclamation
icon inside its right edge in both roadmap groupings. Clicking the icon opens
Risks with Unmitigated selected.
The chevron points down while expanded. Hover or focus a FAB to
see its label. The Milestones table is in **Plan**, immediately below the
Dependency Table, with **Add Milestone** and **Clear Milestones** above it.
Add Milestone starts the same selection flow used for task/section dependencies:
click a task or section in the Dependency Table to create a milestone.
Use the **+** after its last dependency to select another task or section.
Section dependencies include all current tasks in that section, including tasks
added later. Rename milestones and remove dependencies in the Milestones table.
The Deadlines table stays in Roadmap, with its Add and Clear controls.
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

### Deadline and milestone notifications

The notification bell includes approaching deadlines, missed deadlines, and
achieved milestones for active projects you belong to. Both project due dates
and Roadmap deadlines are included. Roadmap deadlines are independent calendar
markers: "missed" means the date has passed, not that a linked task is incomplete.
Archived projects and templates do not produce these alerts.

In Notification settings, independently toggle each event type and choose
deadline reminders on the date, one day before (default), or one week before.
These preferences apply to both the bell and device push; device push still
requires permission and an enabled subscription. Turning a type off hides its
existing alerts. Alerts support the bell's existing read, dismiss, clear-all,
and history controls; opening one navigates to the project's Roadmap.

The daily `/api/tasks/cron` scheduler checks deadlines even when the app is
closed. Project saves and notification refreshes also check these events.
Calendar boundaries use UTC; a deadline is missed starting the following day.
A milestone is achieved when every linked task exists and is complete.
Repeated scans, reopening/recompleting tasks, and dismissing alerts do not
repeat the same event. Changing a deadline date or milestone dependency set
allows a new alert for that revised event.

The document canvas and PWA launch background are black; app content keeps its
existing light/dark backgrounds. This is a best-effort backdrop for Android
system navigation, whose final appearance is controlled by the browser and OS.

Manually switching tabs (including mobile swipes) clears the global search input
and its URL query. Direct links can still open a tab with a search query.

Tasks are managed inside the project editor, in the project-level tasks panel
or a subproject. There is no standalone Tasks tab.
In a project's Tasks view, the navbar chevron opens **Add Task** and **Add
Section** actions. Add Task lets you choose a section and edit task details
before saving.

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

In Plan, a labeled **Link tasks in order** button sits beside each section name
in the Dependency Table (not in the narrow add-link icon column). Click once to link
the full section in its current Tasks sort order (manual, due date, or alphabetical):
task 1 -> task 2 -> task 3, with no preview or confirmation. Filtered-out and completed
tasks are included; recurring tasks are named as excluded in the save status. Existing
links are preserved and duplicates skipped. Cycles prevent saving the chain.
All new links are validated and saved in one request/write, so a failed save
does not leave a partially created chain. This is a one-time action: adding or
reordering tasks later does not automatically change dependencies.

Switching workspace stages or sections inside the open project updates browser
history locally without a server navigation. Workspace selection updates immediately,
without waiting for URL synchronization, while preserving shareable URLs and browser
Back/Forward.

Click the project avatar in the editor header to open **Edit Project Overview**
from any workspace. Overview is no longer in **More**; that menu contains the
remaining project actions.

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

Switching between Tasks, Plan, Roadmap, and Risks slides the content below the header
toward the chosen tab (left for later tabs, right for earlier ones); the header
stays still. Content remains visible during the short 120 ms transition.
Motion is disabled under `prefers-reduced-motion`. All four views
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
  panel header, then select the **Browser & mobile** tab,
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
  Sections appear as tabs on the left, retaining their names and icons; the
  selected tab's options appear on the right. Each notification-type tab has an
  **All notifications** switch that updates only that section in one save.
  When some options are off, the switch enables all of them; when all are on,
  it disables them. Reminder timing is preserved, except legacy Off timings
  become one day before when enabled. **Browser & mobile** remains a device-setup
  tab without a notification-type bulk switch.
  The **Enable notifications** master switch overrides every section, hides all
  bell notifications (including contact requests), and stops device push and
  scheduled reminders when off. Section choices and existing history are preserved.
  Re-enabling requests browser permission from the user's click and registers
  this device again. Browsers do not show another prompt after a grant or denial;
  blocked permission must be changed in browser/OS settings. Bell notifications
  can still be enabled if device notifications are blocked or unsupported.
  Disabled categories are hidden from the bell and its unread count immediately;
  existing stored notifications reappear if re-enabled. Activity notifications
  skipped while disabled are not backfilled. Section switches do not affect contact
  requests; the master switch hides their bell entries without deleting the requests.

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
