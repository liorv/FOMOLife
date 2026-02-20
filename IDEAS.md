# Shopping cart — product & AI ideas

Last updated: 2026-02-20

## Summary
A single-file place to collect UI/UX changes, experiments, and AI feature ideas for FOMO Life. Use this as the canonical backlog for lightweight prototypes and POCs.

---

## Your suggestions (captured)
- Rethink `TaskList` and `PersonList` to appear more like a single-column list (mobile-first).
- Move the user input/add control to the bottom for better mobile thumb reach.
- Consider not using the right-panel Task Editor — explore alternatives (modal, bottom-sheet, inline editor).
- Use AI in the future to help users break down projects into subtasks.
- Add API access and platform integrations (data export/import, webhooks, third‑party sync such as calendar or Zapier).

---

## Top 5 prioritized ideas (my recommendation) ✅
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

4. Inline quick-add + smart shortcuts
   - Add inline `+ add task` at list bottom, support `@` for assignee, `#` for tags/dates, and Enter to submit.
   - Benefit: lower friction for capturing tasks.
   - Estimated effort: medium.

5. AI-assisted project breakdown (POC)
   - MVP: user enters a project brief -> AI returns a list of subtasks, estimates, and suggested assignees.
   - Implementation note: start with a serverless POC (OpenAI or other) then wire to client UI.
   - Estimated effort: medium → high. Needs prompt engineering + UX flow.

---

## Honorable mention — Platform & API integrations
- Provide `API access` for users (per-user API keys, export/import) and integration points (webhooks, Zapier/IFTTT, calendar sync, OAuth connectors).
- POC: JSON export + incoming webhooks + a simple `Integrations` page; longer-term: REST/GraphQL API and connector marketplace.
- Benefit: unlocks power-user workflows, growth through ecosystem integrations, and easier automation for AI features.
- Estimated effort: medium → high. Files: `api/` (new), `src/Integrations.js` (new), update persistence layer.

---

## Quick experiments (fast wins) ⚡
- A/B test: move `Add` input to bottom for screen widths < 600px.
- Convert Task Editor to modal for mobile only (feature flag).
- Prototype a lightweight `Feature requests` page with upvote/downvote (POC: local JSON or GitHub Issues embed).
- Prototype `Export as JSON` + `webhooks` endpoints for third‑party integrations (Zapier/Calendar demo).
- Add an "AI: generate subtasks" button in `TaskModal` that calls a mock POC endpoint.

---

## AI roadmap (MVP → long-term) 🤖
- MVP: Prompt-based subtasks generator (serverless), button in UI, user reviews/edits generated subtasks.
- Phase 2: Templates, estimates, auto-assignee suggestions, confidence scoring.
- Phase 3: Offline/on-device or private instance options, continuous learning from user edits.
- Privacy: always opt-in, show source/confidence, allow disabling data collection.

---

## Acceptance criteria & metrics 📊
- Time-to-add-task reduced by 25% on mobile for mobile-first list.
- Mobile task creation rate increases (DAU retention + key conversion metric).
- % of users using AI-subtask generator (signal for expanding AI features).

---

## Next actions (pick one)
- [ ] Prototype mobile-first list + move `Add` input to bottom (recommended)
- [ ] Implement responsive bottom-sheet Task Editor
- [ ] Prototype feature-request board + voting (POC)
- [ ] Prototype API + integrations (POC)
- [ ] Build AI subtasks POC (serverless + UI button)
- [ ] Create wireframes and usability test scripts

---

## Tags
backlog, ux, mobile, ai, poc, community, feature-requests, integrations, api, webhooks

---

(Referenced files: `src/TaskList.js`, `src/PersonList.js`, `src/TaskModal.js`, `src/Task.js`, `src/Person.js`)
