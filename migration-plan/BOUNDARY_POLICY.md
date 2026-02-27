# Monorepo Boundary Policy

This policy defines allowed import boundaries for `apps/*` and `packages/*`.

## Core rules

1. Apps must not import from other apps.
2. Packages must not import from apps.
3. Shared code is consumed only via `@myorg/<package>` public exports.
4. Deep imports into package internals are forbidden.

## Allowed import examples

- `import { createInviteLink } from '@myorg/utils';`
- `import type { Contact } from '@myorg/types';`
- `import { ContactCard } from '@/components/ContactCard';` (same app alias)

## Forbidden import examples

- `import { x } from '../../apps/contacts/lib/server/auth';`
- `import { y } from '@myorg/utils/src/invite';`
- `import { z } from 'packages/utils/src/invite';`

## Path alias guidance

- App-local alias `@/` is only for the current app root.
- Cross-app sharing must go through `packages/*` and public package exports.
- If you need a new shared symbol, export it from `packages/<name>/src/index.ts`.

## CI checks

- `pnpm lint:mono`
- `pnpm typecheck:mono`

These checks must pass before merge.
