FOMO Life — Developer notes

Images & asset handling
-----------------------

Static images now live under `public/assets` and are served directly by Next.js, which
simplifies asset imports considerably. We still use a small helper component for
robust fallback behavior and diagnostic logging:

- **SmartImage** is the preferred replacement for raw `<img>` tags. It accepts a
  `src` string (usually a `/assets/…` path) and an optional `fallback` URL. On
  error it logs a warning and switches to `fallback` if provided, or a tiny SVG
  placeholder.

### Converting `<img>` to `SmartImage`

1. Add the import (if not already present):

   ```js
   import SmartImage from './SmartImage';
   ```

2. Replace usage:

   ```jsx
   // before
   <img src="/assets/logo.png" alt="Logo" className="app-logo" />

   // after
   <SmartImage src="/assets/logo.png" alt="Logo" className="app-logo" />
   ```

3. Provide `fallback="/assets/placeholder.png"` or similar if you want a
   specific substitute.

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