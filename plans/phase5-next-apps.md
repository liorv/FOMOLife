# Phase 5: Converting Remaining Apps & Ongoing Improvements

After establishing the foundational type and utility packages and migrating the projects and contacts apps, the next wave of work focuses on bringing the rest of the monorepo up to the same standard and tackling broader architecture tasks.

---

## 5.1 Convert "tasks" App to TypeScript

### Goals
- Change all files from `.js`/`.jsx` to `.ts`/`.tsx`.
- Replace any remaining `any` typings with concrete types from `@myorg/types`.
- Update tests (Jest) to use TypeScript.
- Run `pnpm -C apps/tasks run typecheck` and fix errors.
- Build the app (`pnpm -C apps/tasks run build`) to verify.

### Checklist
- [ ] Rename source files
- [ ] Update imports where necessary
- [ ] Add appropriate interfaces (e.g. TaskItem already available)
- [ ] Fix ESLint/TSLint issues if present

---

## 5.2 Convert "framework" App to TypeScript

Steps similar to tasks app; also check for shared logic to extract.

---

## 5.3 Run Root Workspace Audit

- `git grep "\.js" -n apps` to ensure no stray JS.
- Convert any newcomers to TypeScript.
- Add `"strict": true` to each app's `tsconfig.json` as conversion completes.

---

## 5.4 CSS Architecture Overhaul

- Follow `phase3-css-architecture.md`:
  - Move global rules into scoped modules or `components` files
  - Remove `!important` usages
  - Introduce CSS utilities package if needed
  - Ensure sticky header rules are not leaking

---

## 5.5 Testing Infrastructure

- Execute tasks from `phase4-testing-infrastructure.md`:
  - Set up Jest/RTL for each app
  - Add a few representative unit tests (projects, tasks, contacts)
  - Add E2E tests using Playwright or Cypress

---

## Tracking and State

- The `plans/migration-state.json` file records completion of these higher-level steps.
- Update the statuses as each major section is finished so new requests can resume appropriately.


---

## How to Use This Plan

When a request arrives to "proceed and plan all of the above", refer to these sections and perform the earliest uncompleted action. After completing a step, update the state file and commit changes. Ask for clarification if you need to break a section into smaller tasks.
