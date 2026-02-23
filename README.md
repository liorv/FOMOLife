FOMO Life — Developer notes

Images & asset handling
-----------------------

Static images now live under `public/assets` and are served directly by Next.js.
Raw `<img>` tags are acceptable for most use cases; for optional fallback or
troubleshooting you may choose to wrap them manually in a short component or
add an `onError` handler.

### Image guidelines

- Use `<img src="/assets/..." alt="..." />` for static files.
- If you need a fallback, add `onError={e => { e.currentTarget.src = '/assets/placeholder.png'; }}`
  or similar.

(The former SmartImage helper has been removed.)

### Developer tools

- `npm run find-imgs` locates raw `<img` tags that need conversion.
- `npm run verify-assets` checks that all referenced local image files exist and
  are non-empty.
- ESLint is configured to warn about plain `<img>` usage; run `npm run lint`.

These measures help prevent broken images and make asset refs predictable in
both development and production.


PR checklist (recommended)
--------------------------
- [ ] Replace any new `<img>` JSX with `SmartImage`.
- [ ] Run `npm run find-imgs` and verify no unintended `<img>` remain.
- [ ] Run `npm run verify-assets` and `npm test` locally before opening PR.

Why this matters
-----------------
One inconsistent import shape or a missing asset can cause a broken-image icon in users' browsers even when the dev server is serving the file correctly. The `SmartImage` + `assetResolver` + CI checks dramatically reduce the chance of regressions and make failures easy to diagnose.

If you want, I can also add an automated codemod to convert remaining `<img>` tags to `SmartImage` across the codebase.


## Persistence & data APIs

A lightweight persistence layer now lives in `src/api/storage.js`.
Instead of interacting with `localStorage` directly, application code
imports helpers from `src/api/db.js` that wrap the storage layer.  The
`db` API exposes familiar CRUD-style async methods (`getAll`,
`create`, `update`, `remove`) and automatically adds a unique GUID to
every task, project, dream and person.  State mutations throughout the
app call these APIs directly so every change is written through
immediately; the client never has to "save" manually.  On the client these calls no longer hit `localStorage` directly; they
are forwarded to an internal HTTP endpoint (`/api/storage`) which itself
executes the same helpers server‑side and writes into the `data/` folder.
This makes every browser mutation persist to disk today and means the
front‑end is already talking to a network API – you can switch that
endpoint to a real backend in the future with zero client changes.  A
fallback to `localStorage` is retained during Jest tests (and if the
network is unreachable), so unit tests remain fast and offline
behaviour is still sensible.  When the modules run purely on the server
(e.g. during tests or in scripts) they still operate on a JSON file
under `data/`, mimicking a real database and simplifying later
migration.

GUIDs are stable even if arrays are reordered, which enables the UI to
refer to items by id rather than array index and makes scaling to
millions of users (or syncing across devices) much more practical.

The persistence layer now supports **per‑user namespaces**.  Callers
can pass an optional `userId` argument to every `db.*` method (and the
lower‑level `storage` helpers) and the data will be stored under a
separate key/file.  This makes it trivial to run the same code for
different accounts without data leakage.  Unit tests (`storage.test.js`
and `db.test.js`) exercise the namespace behaviour and ensure that
operations remain isolated.

## UI Development & Accessibility Tips

To keep the app maintainable and accessible, please follow these guidelines when
adding or changing interactive UI:

- **Avoid interactive elements inside `<summary>`.**  Browsers and
  assistive technologies handle focus oddly when a `<summary>` contains
  other controls.  Wrap collapsible headers in plain `<div>`s and toggle
  visibility with a class (e.g. `.collapsed`) instead.  See
  `src/components/ProjectEditor.js` for the recent refactor.

- **Mind the stacking context.**  Floating buttons and menus should stack
  predictably.  The tab bar uses `z-index: 100`, modals use `1000`; any
  temporary dropdowns should sit in between (e.g. `.fab-menu { z-index:
  110; }`).  Centralize such rules in `src/App.css`.

- **Write robust tests for stateful UI.**  Always query fresh DOM elements
  before interacting and use `waitFor` when state updates asynchronously.
  Simulate real user pacing when elements disable themselves (`isAdding`);
  a short `setTimeout` in tests helps avoid flakiness.

- **Use proper ARIA roles.**  Add `role="menu"` or similar when a group
  of buttons behaves like a menu.  Keep an eye on `eslint-plugin-jsx-a11y`
  warnings; they often catch issues early.

These tips are now part of the project documentation so future changes
avoid the pitfalls we just fixed.
