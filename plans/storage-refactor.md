# Storage Refactor Plan

Status: Phase 1 complete — Phase 2 planned (see below)

Summary
- Goal: Centralize persistence logic and add a factory to select between file-based storage (local/dev) and Supabase (production). In production, Supabase must be used exclusively (no failover).

What I've done so far
- Extracted shared Supabase helpers into `apps/lib/server/storage.ts`.
- Updated server stores to import the shared helpers:
  - `apps/tasks/lib/server/tasksStore.ts`
  - `apps/contacts/lib/server/contactsStore.ts`
  - `apps/projects/lib/server/projectsStore.ts`

Files changed/added
- [apps/lib/server/storage.ts](apps/lib/server/storage.ts)
- [apps/tasks/lib/server/tasksStore.ts](apps/tasks/lib/server/tasksStore.ts)
- [apps/contacts/lib/server/contactsStore.ts](apps/contacts/lib/server/contactsStore.ts)
- [apps/projects/lib/server/projectsStore.ts](apps/projects/lib/server/projectsStore.ts)
- [plans/storage-refactor.md](plans/storage-refactor.md) (this file)

Current git state
- Last commit message: "storage refactor - initial refactor - Step 1"

Refined plan (small steps)
1. Design unified storage interface (`StorageProvider`) with methods:
   - `load(userId: string): Promise<PersistedUserData | null>`
   - `save(userId: string, data: PersistedUserData): Promise<void>`
2. Implement Supabase provider that implements `StorageProvider` and wraps existing helpers.
3. Implement file-based provider that reads/writes JSON files under `data/` (path configurable). Use exclusive file IO; in dev it is allowed.
4. Implement `createStorageProvider(env?: string): StorageProvider` factory in `apps/lib/server/storage-factory.ts`:
   - If `NODE_ENV === 'production'` or `USE_SUPABASE=true`, return Supabase provider.
   - Otherwise return file provider.
   - Enforce: in production, do NOT fall back to file provider; throw if Supabase is unavailable.
5. Update server stores to import `createStorageProvider` and call provider methods instead of direct helpers.
6. Add unit tests for both providers and the factory behavior (including production fail-on-missing-supabase).
7. Run full test suite and fix any issues.
8. Document usage and commit final changes.

How to continue from here
1. Checkout or create a branch for the next work:

   git checkout -b storage-refactor/factory

2. Implement the `StorageProvider` interface and `storage-factory.ts` under `apps/lib/server/`.
3. Replace direct calls to `loadPersistedUserData`/`savePersistedUserData` with the provider's `load`/`save` in the three stores.
4. Add tests in `apps/*/__tests__` for the providers and factory.
5. Run tests locally (root of repo):

   pnpm -w test

6. Commit incremental changes and push the branch.

Notes & decisions
- File storage default path: use repository root `data/user_data/` with one file per user (`<userId>.json`). This keeps files small and is easy to inspect. If you prefer a different location, change `DATA_DIR` in the file provider implementation.
- Production policy: the factory will throw an error during initialization if Supabase client cannot be created and `NODE_ENV === 'production'` or `USE_SUPABASE=true`.

---

## Phase 2 — Framework as Storage Gateway

### Problem statement

Phase 1 wired all child apps (`contacts`, `projects`, `tasks`) to import from
`apps/lib/server/storage-factory`. This works on a shared filesystem (dev / single
server). In production the three apps are deployed independently and **only the
`framework` app has Supabase credentials**. The child apps either crash (no creds)
or silently fall back to file storage.

Goal: make the `framework` app the **single, authoritative DB gateway**. Child apps
ask framework for data; they never touch Supabase directly. The `StorageProvider`
interface remains unchanged, so the stores themselves need minimal edits.

---

### Target architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  framework app                                                       │
│                                                                      │
│  apps/framework/app/api/storage/route.ts  (NEW)                      │
│    GET  /api/storage?domain=<d>   → load user slice from DB          │
│    PUT  /api/storage?domain=<d>   → save user slice to DB            │
│                                                                      │
│  Reads user identity from X-User-Id header (service-to-service)      │
│  Validates request via X-Internal-Service-Key header                 │
│                                                                      │
│  apps/lib/server/storage-factory  (existing)                         │
│    └─► Supabase / File / InMemory providers (unchanged)              │
└──────────────────────────────────────────────────────────────────────┘
              ▲ HTTP  (server-side only, never from browser)
              │
┌─────────────┼────────────────────────────────────────────────────────┐
│  packages/storage-client  (NEW @myorg/storage-client)               │
│                                                                      │
│  FrameworkStorageProvider implements StorageProvider                 │
│    - calls framework's /api/storage with userId + service key        │
│    - drop-in replacement for createStorageProvider()                 │
└──────────────────────────────────────────────────────────────────────┘
              │ used by
┌─────────────▼────────────────────────────────────────────────────────┐
│  apps/contacts  /  apps/projects  /  apps/tasks                     │
│                                                                      │
│  lib/server/storageClient.ts  (NEW per-app, tiny)                    │
│    dev  → createStorageProvider()  (unchanged local behaviour)       │
│    prod → createFrameworkStorageProvider({ url, key })               │
│                                                                      │
│  lib/server/*Store.ts  (change ONE import per file)                  │
│    - const storage = createStorageProvider()                         │
│    + const storage = getStorage()                                    │
└──────────────────────────────────────────────────────────────────────┘
```

**Key design decisions**

| Decision | Rationale |
|---|---|
| HTTP not direct import | Child apps are separate deployment units; they cannot share in-process memory or filesystem with framework in production |
| Service-key auth | Server-to-server calls; forwarding browser cookies cross-origin is fragile and couples session implementations |
| Per-domain slice API (`?domain=`) | Prevents one app from accidentally overwriting another app's data in the shared blob  |
| Dev keeps local providers | Zero change to dev workflow; no framework dependency when running locally |
| `StorageProvider` contract unchanged | All store files change only one line (the import/factory call) |

---

### Domain slices

The `PersistedUserData` blob is partitioned into domain slices so each app only
reads/writes its own fields:

| App | Domain param | Blob fields read/written |
|---|---|---|
| tasks | `tasks` | `tasks` |
| projects | `projects` | `projects` |
| contacts | `people` | `people`, `groups` |

The storage API merges slices server-side (read-modify-write within framework),
preventing cross-app data loss.

---

### Step-by-step implementation plan

#### Step 2-A — Framework storage gateway API  *(additive, no breaking changes)*

**File:** `apps/framework/app/api/storage/route.ts`

1. Parse `X-Internal-Service-Key` header and compare with `process.env.INTERNAL_SERVICE_KEY`.
   Return `401` if missing or invalid.
2. Parse `X-User-Id` header for the user identity.  Return `400` if missing.
3. Parse `?domain=tasks|projects|people` query param.  Return `400` if unrecognised.
4. `GET`: call `storage.load(userId)`, extract the slice for the requested domain,
   return `{ data: <slice> }`.
5. `PUT`: parse request body `{ data: <slice> }`, call `storage.load(userId)` to get
   existing blob, merge the domain slice, call `storage.save(userId, merged)`.
6. The route uses the same `createStorageProvider()` factory already used by
   framework's own code — no new DB plumbing.
7. Register the route only on the framework app; add `INTERNAL_SERVICE_KEY` to
   framework's env docs and `.env.example`.

**Security notes**
- `INTERNAL_SERVICE_KEY` must be at least 32 characters; validate length at startup.
- Route is behind `/api/storage`; expose behind ingress allow-list in production
  (framework's own network, not public internet).
- `X-User-Id` is trusted only after service key is validated; never derive user
  identity from user-supplied headers without first checking the service key.

---

#### Step 2-B — `packages/storage-client` workspace package  *(new package)*

**Files to create:**

```
packages/storage-client/
  package.json          name: @myorg/storage-client, peerDep: @myorg/storage
  tsconfig.json
  src/
    framework-provider.ts    FrameworkStorageProvider class
    index.ts                 exports
```

`FrameworkStorageProvider` implements `StorageProvider`:

```ts
class FrameworkStorageProvider implements StorageProvider {
  constructor(private config: { frameworkUrl: string; serviceKey: string; domain: string }) {}

  async load(userId: string): Promise<PersistedUserData | null> {
    const res = await fetch(
      `${this.config.frameworkUrl}/api/storage?domain=${this.config.domain}`,
      { headers: { 'X-Internal-Service-Key': this.config.serviceKey, 'X-User-Id': userId } }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Storage load failed: ${res.status}`);
    const { data } = await res.json();
    return data;
  }

  async save(userId: string, data: PersistedUserData): Promise<void> {
    const res = await fetch(
      `${this.config.frameworkUrl}/api/storage?domain=${this.config.domain}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Key': this.config.serviceKey,
          'X-User-Id': userId,
        },
        body: JSON.stringify({ data }),
      }
    );
    if (!res.ok) throw new Error(`Storage save failed: ${res.status}`);
  }
}

export function createFrameworkStorageProvider(
  config: { frameworkUrl: string; serviceKey: string; domain: string }
): StorageProvider {
  return new FrameworkStorageProvider(config);
}
```

Add unit tests in `packages/storage-client/__tests__/`:
- Mock `fetch`; assert correct URL, headers, and body are sent.
- Assert `load` returns `null` on 404 and throws on other errors.
- Assert `save` throws on non-2xx.

---

#### Step 2-C — Per-app `storageClient.ts` shim  *(one new file per child app)*

**File (identical pattern for all three apps):**

`apps/<app>/lib/server/storageClient.ts`

```ts
import 'server-only';
import { createStorageProvider } from '../../../lib/server/storage-factory';
import { createFrameworkStorageProvider } from '@myorg/storage-client';
import type { StorageProvider } from '../../../lib/server/storage-provider';

const DOMAIN_MAP = {
  contacts: 'people',
  projects: 'projects',
  tasks: 'tasks',
} as const;

// Replace the key with the app name at creation time, e.g. 'tasks'
const APP_DOMAIN = DOMAIN_MAP['<app-name>'];

export function getStorage(): StorageProvider {
  const frameworkUrl = process.env.FRAMEWORK_INTERNAL_URL?.trim();
  const serviceKey = process.env.INTERNAL_SERVICE_KEY?.trim();

  if (frameworkUrl && serviceKey) {
    return createFrameworkStorageProvider({
      frameworkUrl,
      serviceKey,
      domain: APP_DOMAIN,
    });
  }

  // Fallback to local providers (dev / test)
  return createStorageProvider();
}
```

The condition `if (frameworkUrl && serviceKey)` means:
- **Dev**: vars not set → local file/in-memory provider, zero behaviour change.
- **Prod**: vars set → HTTP to framework.

---

#### Step 2-D — Update each store to use `getStorage()`  *(one-line change per store)*

**`apps/tasks/lib/server/tasksStore.ts`**
```diff
- import { createStorageProvider } from '../../../lib/server/storage-factory';
+ import { getStorage } from './storageClient';
  ...
- const storage = createStorageProvider();
+ const storage = getStorage();
```

**`apps/projects/lib/server/projectsStore.ts`**  (same pattern)

**`apps/contacts/lib/server/contactsStore.ts`**  (same pattern)

No logic changes in the stores — they already use `StorageProvider.load/save`.

---

#### Step 2-E — Add `@myorg/storage-client` to child app dependencies

In each child app's `package.json`, add:
```json
"dependencies": {
  "@myorg/storage-client": "*"
}
```

And add `packages/storage-client` to `pnpm-workspace.yaml` packages list.

---

#### Step 2-F — Environment variable documentation

**Framework app** (`.env.example` / README):
```
INTERNAL_SERVICE_KEY=<random-32+-char-string>   # required in production
```

**Each child app** (`.env.example` / README):
```
FRAMEWORK_INTERNAL_URL=https://framework.yourdomain.com   # required in production
INTERNAL_SERVICE_KEY=<same-value-as-framework>            # required in production
```

In local dev both vars are **omitted** to keep using the file provider.

---

#### Step 2-G — Deprecate / shim `apps/lib/server/`

Once all child apps import from `./storageClient` (which itself still re-uses
`apps/lib/server/storage-factory` for local dev), the direct imports from
`../../../lib/server/` are gone from production paths.

Post-migration option: keep `apps/lib/server/` as-is (it is used by the per-app
`storageClient.ts` shim) or promote it to a `packages/storage` workspace package
for cleaner boundaries. This is a separate, lower-priority cleanup.

---

### Migration order (safe, incremental)

1. **2-A** — Add framework storage gateway API. Deploy framework. Verify with a curl test.
2. **2-B** — Create `packages/storage-client`. Add tests, confirm build passes.
3. **2-C + 2-D** — Migrate `tasks` app first (smallest store). Keep dev env vars unset to confirm local behaviour unchanged. Set prod env vars and test end-to-end.
4. Repeat step 3 for `projects`, then `contacts`.
5. **2-F** — Update env docs and deployment scripts (`deploy.sh`).
6. **2-G** *(optional)* — Promote `apps/lib/server/` to `packages/storage`.

Each step can be merged and deployed independently.  A failed deployment of a child
app in step 3/4 does not affect other apps or the framework.

---

### Testing strategy

| Layer | What to test |
|---|---|
| `packages/storage-client` | Unit: mock fetch, assert correct headers/URL/body |
| `apps/framework/app/api/storage` | Integration: valid key → correct slice returned; wrong key → 401; missing userId → 400; unknown domain → 400 |
| `apps/tasks`, `apps/projects`, `apps/contacts` store tests | Unchanged — stores already use `StorageProvider` mock; `getStorage()` shim returns the same mock in test env |
| `apps/lib/__tests__/storage-factory.test.ts` | Existing tests continue to pass (no changes) |

---

### Risks and mitigations

| Risk | Mitigation |
|---|---|
| Framework outage blocks all apps from reading/writing data | Keep `getStorage()` fallback to local file provider when env vars missing; add health-check retries in `FrameworkStorageProvider` |
| Race condition: two apps write the same user blob simultaneously via framework | Framework route must use a DB-level advisory lock or upsert with row-level locking (Supabase `upsert` with `onConflict: 'user_id'` already handles this at the DB level) |
| `INTERNAL_SERVICE_KEY` leaked in logs | Never log headers; rotate key via env var update without code change |
| Large blob performance | The slice API already limits reads/writes to one domain; long-term, split `user_data` into per-domain tables (`user_tasks`, `user_projects`, `user_contacts`) — the gateway API makes this transparent to child apps |
