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