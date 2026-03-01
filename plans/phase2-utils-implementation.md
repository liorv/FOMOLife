# Phase 2: Utils Package - Step-by-Step Implementation

**Purpose**: Create shared utility functions and hooks in `@myorg/utils` package  
**Approach**: One small step at a time, verify each step before proceeding

---

## Overview

Phase 2 extracts common patterns from apps into shared utilities:
1. **useAsyncState** hook - Eliminates duplicate loading/error state boilerplate
2. **taskFilters** - Already in projects app, move to shared utils
3. **generateId** - Already in projects app, move to shared utils
4. **validation helpers** - isNonEmptyString (already partially in utils)

---

## Prerequisites Check

Before starting, verify current state:

```bash
# Check current utils package structure
ls -la packages/utils/src/

# Check current exports
cat packages/utils/src/index.ts

# Verify packages build
pnpm --filter @myorg/utils build
```

---

## Step 2.1: Create useAsyncState Hook

**File**: `packages/utils/src/async/useAsyncState.ts`

**Action**: Create new hook that handles loading/error/data state

**Hook Signature**:
```typescript
export function useAsyncState<T>(
  fetcher: () => Promise<T>,
  deps?: DependencyList
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}
```

**Verification**:
```bash
# File exists
ls packages/utils/src/async/useAsyncState.ts

# TypeScript valid
pnpm --filter @myorg/utils typecheck
```

**Status**: [ ] Not started

---

## Step 2.2: Create Async Directory Barrel Export

**File**: `packages/utils/src/async/index.ts`

**Action**: Export useAsyncState from barrel file

**Verification**:
```bash
cat packages/utils/src/async/index.ts
```

**Status**: [ ] Not started

---

## Step 2.3: Move taskFilters to Utils

**Source**: `apps/projects/utils/taskFilters.js`

**Action**: Copy to `packages/utils/src/taskFilters.ts` and convert to TypeScript

**Original (JS)**:
```javascript
export function applyFilters(tasks, filters, search) { ... }
```

**Converted (TS)**:
```typescript
import type { TaskItem } from '@myorg/types';

export function applyFilters(
  tasks: TaskItem[],
  filters: string[],
  search: string
): TaskItem[] { ... }
```

**Verification**:
```bash
# File exists
ls packages/utils/src/taskFilters.ts

# TypeScript valid
pnpm --filter @myorg/utils typecheck
```

**Status**: [ ] Not started

---

## Step 2.4: Move generateId to Utils

**Source**: `apps/projects/utils/generateId.js`

**Action**: Copy to `packages/utils/src/id/generateId.ts`

**Verification**:
```bash
ls packages/utils/src/id/generateId.ts
pnpm --filter @myorg/utils typecheck
```

**Status**: [ ] Not started

---

## Step 2.5: Update Utils Barrel Export

**File**: `packages/utils/src/index.ts`

**Action**: Export all new utilities

**Expected exports**:
```typescript
// async
export { useAsyncState } from './async';

// filters
export { applyFilters } from './taskFilters';

// id
export { generateId } from './id/generateId';
```

**Verification**:
```bash
cat packages/utils/src/index.ts
pnpm --filter @myorg/utils build
```

**Status**: [ ] Not started

---

## Step 2.6: Update Tasks App to Use Shared Utils

**File**: `apps/tasks/components/TasksPage.tsx`

**Action**: Import `applyFilters` from `@myorg/utils` instead of local import

**Before**:
```typescript
import { applyFilters } from '../../projects/utils/taskFilters';
```

**After**:
```typescript
import { applyFilters } from '@myorg/utils';
```

**Verification**:
```bash
pnpm --filter tasks typecheck
pnpm --filter tasks build
```

**Status**: [ ] Not started

---

## Step 2.7: Update Projects App to Use Shared Utils

**File**: `apps/projects/components/ProjectsPage.tsx`

**Action**: Import utilities from `@myorg/utils`

**Before** (in various files):
```javascript
import { applyFilters } from '../utils/taskFilters';
import { generateId } from '../utils/generateId';
```

**After**:
```typescript
import { applyFilters, generateId } from '@myorg/utils';
```

**Verification**:
```bash
pnpm --filter projects typecheck
pnpm --filter projects build
```

**Status**: [ ] Not started

---

## Step 2.8: Create useAsyncState Usage Example (Tasks)

**File**: `apps/tasks/components/TasksPage.tsx`

**Action**: Show how to use useAsyncState (optional - for demonstration)

**Before**:
```typescript
const [tasks, setTasks] = useState<TaskItem[]>([]);
const [loading, setLoading] = useState(true);
const [errorMessage, setErrorMessage] = useState<string | null>(null);

useEffect(() => {
  let active = true;
  (async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const loaded = await api.listTasks();
      if (active) setTasks(loaded);
    } catch (error) {
      if (active) setErrorMessage(error instanceof Error ? error.message : 'Failed');
    } finally {
      if (active) setLoading(false);
    }
  })();
  return () => { active = false; };
}, [api]);
```

**After** (using hook):
```typescript
const { data: tasks, loading, error } = useAsyncState(
  () => api.listTasks(),
  [api]
);
```

**Note**: This step is optional - can skip if current pattern is preferred.

**Verification**:
```bash
pnpm --filter tasks typecheck
pnpm --filter tasks build
```

**Status**: [ ] Not started (Optional)

---

## Step 2.9: Final Verification

**Action**: Run all verification commands

**Commands**:
```bash
# Full monorepo typecheck
pnpm typecheck:mono

# Full build
pnpm turbo build --filter=framework --filter=contacts --filter=projects --filter=tasks

# Count utils exports
cat packages/utils/src/index.ts | grep -c "export"

# Verify apps import from @myorg/utils
grep -r "@myorg/utils" apps/*/components/*.tsx
```

**Expected Results**:
- [ ] `pnpm typecheck:mono` passes with 0 errors
- [ ] All apps build successfully
- [ ] Utils package exports 3+ utilities
- [ ] Tasks and Projects apps import from `@myorg/utils`

**Status**: [ ] Not started

---

## Step Execution Template

For each step, use this template:

```markdown
### Step X.X Execution - [Date]

**Action Taken**:
[Describe what was done]

**Files Modified**:
- [ ] File 1
- [ ] File 2

**Verification Results**:
```
[Paste command output]
```

**KPI Check**:
| Metric | Expected | Actual | Pass |
|--------|----------|--------|------|
| [metric] | [value] | [value] | [Y/N] |

**Decision**:
- [ ] APPROVED: Proceed to next step
- [ ] REJECTED: Fix issues before proceeding

**Notes**:
[Any observations]
```

---

## Rollback Plan

If any step fails:

1. **Revert file changes**: `git checkout -- <file>`
2. **Check TypeScript**: `pnpm typecheck:mono`
3. **Document issue**: Note what went wrong
4. **Fix and retry**: Address the issue before proceeding

---

## Success Criteria for Phase 2

Phase 2 is complete when:

| Criteria | Verification |
|----------|--------------|
| useAsyncState created | `ls packages/utils/src/async/` shows hook |
| taskFilters moved | `ls packages/utils/src/taskFilters.ts` |
| generateId moved | `ls packages/utils/src/id/generateId.ts` |
| Apps use shared utils | Imports from `@myorg/utils` |
| TypeScript passes | `pnpm typecheck:mono` exits 0 |
| Build passes | Apps build successfully |

---

## Benefits of Phase 2

### Code Reduction
- **Before**: Loading/error pattern repeated ~60 lines in each app
- **After**: Single hook (~30 lines), each app just calls it

### Consistency  
- Same loading/error handling across all apps
- Same filtering logic for tasks

### Maintainability
- Fix bug in one place, all apps benefit
- Add feature in one place, all apps get it

---

## Next Phase

After Phase 2 is verified complete, proceed to:
- **Phase 3**: UI Components (Icon, EmptyState, DashboardCard)
- **Phase 4**: Fix Boundary Violation (move TaskList, AddBar to packages/ui)

---

## Notes

- Steps can be done in parallel where independent
- Each step verification is quick (seconds)
- Commit after entire phase is verified
