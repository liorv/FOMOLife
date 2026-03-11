# Storage Refactor Plan

Status: in-progress

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

If you want, I can implement the factory and the two providers now and add tests. Reply with "Implement factory" to proceed.
