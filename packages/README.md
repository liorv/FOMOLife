# Shared packages (strict boundary)

Rules for this repo migration:

1. Apps in `apps/*` may import from `@myorg/*` packages only.
2. Apps must never import code from other apps.
3. Shared logic must move into `packages/*` with explicit public exports.
4. No deep imports into package internals.
