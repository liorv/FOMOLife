# FOMO Life

FOMO Life is a compact, single-page task/project/dream manager focused on fast entry, lightweight collaboration, and flexible notifications. The app runs entirely in the browser and persists data to LocalStorage so you can iterate quickly without a backend.

---

## Features (complete)

- Tasks, Projects, Dreams tabs — simple CRUD for each item. Tasks include done/favorite/due-date.
- Global People directory — manage people separately from tasks.
- Per-task people assignment — different tasks can notify different people (not a global-only mapping).
- Add people from the Task editor (creates the person globally and assigns them to the task).
- Per-person notification methods (Discord, SMS, WhatsApp) stored on the person and overridable per task.
- Search-as-you-type when adding people to a task, with keyboard navigation (Arrow keys, Enter, Escape).
- Autosave behavior: the Task editor persists edits on unmount (switching tasks won't lose edits).
- Save & Close (Done) button and keyboard shortcuts (Esc, Ctrl/Cmd+Enter) to finish editing.
- Minimal task-row UI — shows person avatars / counts (methods hidden for compactness).
- LocalStorage persistence (no server required).

---

## UI / UX

- Google-like Material appearance: Roboto font, clean elevation, blue primary accent, rounded cards.
- Task editor is a right-side panel showing the task name, due date and settings.
- People are searchable from the editor and added with a single click or Enter key.
- Autosave ensures you won't lose work when switching editors; explicit "Done" closes the editor.

---

## Data model (LocalStorage)

Stored under key `fomo_life_data` as JSON:

- tasks: [{ text, done, favorite, dueDate, people: [{ name, methods: { discord, sms, whatsapp } }] }]
- people: [{ name, methods: { discord, sms, whatsapp } }]
- projects: [{ text, done }]
- dreams: [{ text, done }]

Notes:
- People attached to a task are stored as objects so task-level overrides are possible.
- Creating a person from the Task editor will add them to the global `people` list.

---

## Keyboard shortcuts

- Enter (in Add input): add item
- ArrowUp / ArrowDown (in people search): move suggestion highlight
- Enter (in people search): add highlighted person
- Escape (in people search): clears search; Escape (when search empty) = Done (save & close editor)
- Ctrl/Cmd + Enter: Done (save & close editor)

---

## Developer / Local run

- Dev server: `npm run dev` (Parcel) — app served at `http://localhost:1234`
- Production build: `npm run build` (Parcel build)
- Quick static serve: `npm start` (uses `serve -s public` after build)

---

## Files of interest

- `src/App.js` — root UI and app state (data load/save, tabs, task list). The app bar shows your logo if `public/logo.png` exists.
- `src/TaskModal.js` — task editor / people search / per-person methods
- `src/App.css` — core styling (Material-like theme)
- `src/index.js` — app bootstrap

To change the app logo: drop your image as `public/logo.png` (recommended ~512×512). The app will display it in the app bar and use it as the favicon.
---

## Design & extension notes for an LLM or future dev

- State is a single object saved to LocalStorage; update via setState in `App.js` and saved automatically via effect.
- `TaskModal` accepts callbacks: `onUpdateTask` (persist without closing), `onSave` (save & close), `onCreatePerson` (add to global people list).
- To add server sync: replace `saveData`/`loadData` in `App.js` with API calls and handle optimistic updates.
- To persist per-person contact details (phone, discord id): extend the `people` objects and update the Task editor UI.

---

## Recent / Important behavior changes

- People can be created from the Task editor and are added to the global list.
- Task editor autoscapes edits on unmount so switching tasks won't lose edits.
- Suggestions are keyboard-navigable and include an explicit "Add \"name\"" option when nothing matches.
- Task rows show minimal avatars and a +N indicator instead of full method icons — per-person methods remain editable inside the task editor.

---

## TODO / ideas

- Add server sync / user accounts
- Rich person profiles (avatar image, contact handles)
- Reminders / scheduled notifications
- Shareable project boards

---

## Contact / License

MIT — feel free to modify and extend.
