# Shopping cart — product ideas

Last updated: 2026-10-22

## Summary
A single-file place to collect UI/UX changes, experiments, and feature ideas for FOMO Life. Use this as the canonical backlog for lightweight prototypes and POCs.

## Current product direction
- Due dates are deadlines: tasks need to be completed before them, not scheduled on them.
- An in-app calendar or calendar sync is not a current priority.
- The AI assistant and AI-assisted project breakdown are no longer product priorities. This backlog update does not remove existing functionality.
- Home already covers cross-project attention through its existing task panels. Do not add a separate Next up queue or saved cross-project views.
- Overdue and Coming Due on Home are sufficient for the user's follow-up needs; a separate waiting/blocked state is not wanted.
- A quick-capture inbox is not needed.
- Undated tasks are backlog: they may be long-term reminders rather than work that deserves attention now. Do not automatically give them space on Home.
- Keep supporting project information in external tools such as NotebookLM, linked from the project. Native task attachments are not wanted.
- Custom repeat intervals and a trash area are not needed.
- Task change history is potentially interesting but low priority, with no current need.
- Current feature interests are periodic email summaries and task dependencies with a planning aspect. Neither has been selected for implementation yet.
- The older UI ideas below are historical suggestions; check the current implementation before treating them as missing features.

---

## Your suggestions (captured)
- Rethink `TaskList` and `PersonList` to appear more like a single-column list (mobile-first).
- Move the user input/add control to the bottom for better mobile thumb reach.
- Consider not using the right-panel Task Editor — explore alternatives (modal, bottom-sheet, inline editor).
- Add API access and platform integrations (data export/import, webhooks, third-party automation such as Zapier).

---

## Historical suggestions (not a current priority ranking)
1. Mobile-first list + bottom add (recommended)
   - Convert `TaskList` / `PersonList` to single-column stacks; place the `Add` input at the bottom on small screens.
   - Benefit: faster one-handed entry and improved mobile retention.
   - Estimated effort: small → medium. Files: `src/TaskList.js`, `src/PersonList.js`, `src/Task.js`.

2. Replace right-panel editor with a responsive bottom-sheet or inline editor
   - Desktop: modal or optional drawer; Mobile: bottom-sheet that covers 50–80% height.
   - Benefit: consistent UX across devices and simpler navigation.
   - Estimated effort: medium. Files: `src/TaskModal.js`, `src/TaskEditor` (new).

3. Community feature‑request board (voting) — add upvote/downvote + status
   - Provide a public or embedded `Feature requests` page where users can submit ideas, upvote/downvote, comment, and see maintainer status (planned/in progress/done).
   - POC options: GitHub Issues + embed, serverless JSON + client-side votes, or a small API-backed voting endpoint.
   - Benefit: transparent roadmap signal, community prioritization, and single source for the shopping list.
   - Estimated effort: medium. Files: `src/FeatureRequests.js` (new), update `IDEAS.md`, add simple API or use GitHub Issues.

---

## Honorable mention — Platform & API integrations
- Provide `API access` for users (per-user API keys, export/import) and integration points (webhooks, Zapier/IFTTT, OAuth connectors).
- POC: JSON export + incoming webhooks + a simple `Integrations` page; longer-term: REST/GraphQL API and connector marketplace.
- Benefit: unlocks power-user workflows, growth through ecosystem integrations, and easier automation.
- Estimated effort: medium → high. Files: `api/` (new), `src/Integrations.js` (new), update persistence layer.

---

## Quick experiments (fast wins) ⚡
- A/B test: move `Add` input to bottom for screen widths < 600px.
- Convert Task Editor to modal for mobile only (feature flag).
- Prototype a lightweight `Feature requests` page with upvote/downvote (POC: local JSON or GitHub Issues embed).
- Prototype `Export as JSON` + `webhooks` endpoints for third-party integrations (Zapier demo).

---

## Current feature candidates (scope not yet agreed)

### Periodic email summary
- User interest: receive a summary of what was completed over a period and what is upcoming, at a chosen frequency.
- Proposed first version: an opt-in weekly email with completed work grouped by project, outstanding overdue tasks, and tasks with deadlines in the next week. This cadence and scope are recommendations, not confirmed requirements.
- Keep undated backlog out of the upcoming section. Deadlines do not imply a scheduled work date.
- Decide reporting scope (personal work versus shared-project work), frequency, delivery time/timezone, and empty-summary behavior before implementation.
- Preserve completion occurrences for accurate reporting, especially recurring tasks and tasks later reopened or deleted. A task's latest completion timestamp alone cannot represent every completion in a reporting period.
- Use deterministic summaries; an AI-generated narrative is not required.

### Task dependencies and planning
- User interest: express dependencies between tasks and add a planning aspect.
- Proposed first version: prerequisites within one project, including across its subprojects, with a simple ordered or dependency view.
- Show what needs to happen before another task and which prerequisite deadlines are later than dependent-task deadlines.
- Distinguish structural dependencies from the previously declined manual waiting/blocked status. A task can have unmet prerequisites even before its deadline.
- Decide dependency scope, whether dependencies warn or prevent completion, and the desired planning view before implementation.
- Reject self-dependencies and cycles; define behavior for deleted or reopened prerequisites and recurring tasks.
- Do not add calendar scheduling, automatically shift deadlines, or promote undated backlog onto Home as part of this feature.

## Deferred
- Task change history: potentially useful for shared projects, but low priority and not needed now.

---

## Acceptance criteria & metrics 📊
- Time-to-add-task reduced by 25% on mobile for mobile-first list.
- Mobile task creation rate increases (DAU retention + key conversion metric).
- Define acceptance criteria for any new candidate only after the user selects it.

---

## Next actions (pick one)
- [ ] Prototype mobile-first list + move `Add` input to bottom (recommended)
- [ ] Implement responsive bottom-sheet Task Editor
- [ ] Prototype feature-request board + voting (POC)
- [ ] Prototype API + integrations (POC)
- [ ] Agree on reporting scope and cadence for periodic email summaries
- [ ] Define dependency rules and the planning experience before implementation
- [ ] Create wireframes and usability test scripts

---

## Tags
backlog, ux, mobile, poc, community, feature-requests, integrations, api, webhooks

---

(Referenced files: `src/TaskList.js`, `src/PersonList.js`, `src/TaskModal.js`, `src/Task.js`, `src/Person.js`)
