# Next Tab Extraction Template

Use this playbook to extract one new app from the root app with minimal ad hoc decisions.

Variables:
- app slug: `<appname>`
- package/app path: `apps/<appname>`
- Vercel project name: `fomo-life-<appname>`

## 1) Scaffold app

Checklist:
- Create `apps/<appname>` using the same Next.js scaffold shape as `apps/contacts`.
- Add workspace package metadata and scripts.
- Add app to Turbo filter targets.

Commands:
- `pnpm --filter <appname> install`
- `pnpm turbo build --filter=<appname> --dry`

## 2) Extract domain types and utilities

Checklist:
- Move shareable domain contracts into `packages/types`.
- Move shareable pure utilities into `packages/utils`.
- Export through package public APIs only.
- Keep app-specific logic in `apps/<appname>`.

Commands:
- `pnpm turbo build --filter=@myorg/types --filter=@myorg/utils`
- `pnpm turbo lint --filter=<appname>`

## 3) Move UI and isolate styles

Checklist:
- Move tab UI into `apps/<appname>/app` and `apps/<appname>/components`.
- Convert new styles to CSS Modules.
- Avoid global style coupling with root app styles.

Commands:
- `pnpm turbo dev --filter=<appname>`
- `pnpm turbo build --filter=<appname>`

## 4) Wire data and auth boundaries

Checklist:
- Route all data access through `packages/api-client` (or app-local adapters that depend on shared clients).
- Keep auth/session logic behind explicit interfaces.
- Enforce no `apps/*` -> `apps/*` imports.

Commands:
- `pnpm turbo lint --filter=<appname>`
- `pnpm turbo test --filter=<appname>`

## 5) Verify tests, build, and deploy

Checklist:
- Confirm app build and test pass.
- Configure independent Vercel project using required naming convention: `fomo-life-<appname>`.
- Validate deploy logs and app health URL.

Commands:
- `pnpm turbo test --filter=<appname>`
- `pnpm turbo build --filter=<appname>`
- `vercel pull --yes`
- `vercel link --project fomo-life-<appname>`
- `vercel deploy --prod`
- `vercel inspect https://fomo-life-<appname>.vercel.app --logs`

## Risk matrix

| Risk | Signal | Mitigation |
|---|---|---|
| Cross-app coupling introduced | Lint/import boundary violations | Move shared code to `packages/*`; re-export from package entrypoints only |
| Styling regressions | Visual drift after UI move | Keep CSS Modules local; migrate incrementally by component |
| Data/auth regressions | Runtime errors or unauthorized states | Add adapter interfaces; verify session/data flows in smoke tests |
| Build/deploy mismatch | Local build passes but Vercel fails | Mirror Vercel install/build commands locally before deploy |

## Rollback

1. Revert extraction commit(s) for current app.
2. Keep shared package additions only if already consumed safely by existing apps.
3. Restore previous route/tab wiring in root app.
4. Re-run:
   - `pnpm turbo lint --filter=<appname>`
   - `pnpm turbo test --filter=<appname>`
   - `pnpm turbo build --filter=<appname>`
5. If Vercel project was created prematurely, disable production alias until next attempt.

## Completion gate

Only mark extraction done when:
- No forbidden cross-app imports exist.
- Shared code is consumed via package public APIs.
- App tests/build succeed.
- Vercel deploy for `fomo-life-<appname>` is healthy.