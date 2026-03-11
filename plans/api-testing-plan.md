# API Testing Plan — Incremental Steps

Goal: add focused tests to cover integration, storage provider behavior, client parsing, and edge cases so runtime 500s are caught by CI.

1) Add integration handler test: `tasks` POST
- Create `apps/tasks/__tests__/integration/tasks.integration.test.ts`.
- Configure `createStorageProvider()` to return InMemory provider for the test run.
- Seed a test user and call `routes.POST()` with `{ text: 'Task 1' }`.
- Acceptance: receives 201 and task object; if 500, test surfaces server stack trace.

2) Add integration handler tests: `contacts` POST/INVITE flows
- Tests for `POST /api/contacts`, `POST /api/contacts/invite`, and `GET /api/contacts/invite/[token]` using InMemory provider.
- Acceptance: expected 201/200/200 responses and created/decoded invite tokens.

3) Storage factory unit tests
- Add tests for `apps/lib/server/storage-factory.ts` verifying provider selection based on `NODE_ENV` and env vars.
- Acceptance: in `test` env -> InMemory; in `production` -> Supabase when configured; never File provider in production.

4) Storage provider unit tests (File & Supabase, with mocks)
- Mock `fs` for file provider and Supabase client for Supabase provider; test CRUD success and simulated IO/network failures.
- Acceptance: provider surfaces predictable errors and does not crash the route.

5) API client `parseResponse` tests
- Unit tests for `parseResponse` with 2xx/4xx/5xx, JSON and non-JSON bodies, and missing body cases.
- Acceptance: errors include status + body when available; success returns parsed payload.

6) Route-level negative tests (validation & params)
- For each route: test missing required fields -> 400; missing path params -> 400/404.
- Acceptance: handlers return appropriate status and message.

7) Invite token edge cases
- Tests for expired token -> 410; invalid token -> 404; used token concurrency -> 404.

8) CORS & OPTIONS tests
- For routes exposing `corsResponse`, test OPTIONS preflight and Access-Control headers for origins and credentials.

9) UI error-handling tests
- Mock API client to return 500 + structured error payloads; assert components show errors and recover.

10) Add test fixtures & seeds repo-wide
- Central `test/fixtures` per app with deterministic sample users, contacts, tasks, projects.

11) CI integration
- Ensure `test:mono` or workspace test runner runs these new suites; add caching and test filters for speed.

12) Monitoring & follow-up
- Add a failing example test if a 500 is reproducible to prevent regressions; keep flaky tests quarantined and tracked.

Notes:
- Keep each test small and focused; prefer handler-level integration tests (no network) over full browser E2E.
- Prioritize steps 1–5 to catch runtime provider and parsing failures quickly.

Estimated order of work: implement steps 1–3 (high priority), then 4–6, then 7–9, then CI and monitoring.
