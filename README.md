FOMO Life — Developer notes

Images & asset handling
-----------------------

To avoid broken or incorrectly-resolved images in the app, we use a single resilient component and a set of safety checks:

- Use `SmartImage` for all runtime `<img>` usage. It provides automatic fallback + clear console logging when an image fails to load.
- The `assetResolver` normalizes imported assets so bundler-specific shapes (Parcel, webpack, etc.) work reliably.
- CI verifies referenced image files exist and unit tests cover the resolver.

How to convert an `<img>` to `SmartImage`

1. Add the import (if not present):

   import SmartImage from './SmartImage';

2. Replace JSX usage:

   // before
   <img src={logoUrl} alt="Logo" className="app-logo" />

   // after
   <SmartImage src={logoUrl} alt="Logo" className="app-logo" />

3. Optionally provide a `fallback` prop (URL or data-URI) to control what shows on error.

Automated checks and developer tools
-----------------------------------

- Find remaining `<img>` usage in the repo:

  npm run find-imgs

  This prints files and line numbers where a plain `<img` appears so you can convert them.

- Lint enforcement: ESLint is configured to disallow JSX `<img>` elements (rule -> `Use <SmartImage> instead`).
  Running `npm run lint` will fail if any JSX `<img>` remains.

- Asset verification: `npm run verify-assets` ensures referenced local image files exist and are non-empty.

- Headless verification (optional): `npm run verify-logo-dom` runs a Puppeteer check that validates the app loads images at runtime.

PR checklist (recommended)
--------------------------
- [ ] Replace any new `<img>` JSX with `SmartImage`.
- [ ] Run `npm run find-imgs` and verify no unintended `<img>` remain.
- [ ] Run `npm run verify-assets` and `npm test` locally before opening PR.

Why this matters
-----------------
One inconsistent import shape or a missing asset can cause a broken-image icon in users' browsers even when the dev server is serving the file correctly. The `SmartImage` + `assetResolver` + CI checks dramatically reduce the chance of regressions and make failures easy to diagnose.

If you want, I can also add an automated codemod to convert remaining `<img>` tags to `SmartImage` across the codebase.