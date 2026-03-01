# FOMO Life Architecture Improvement KPIs

**Created**: 2026-03-01  
**Purpose**: Define measurable KPIs to verify architecture improvements before and after implementation

---

## Critical: No Code Commit Until Verified

All changes must be manually verified against these KPIs before committing.

---

## KPI Categories

### 1. Boundary Compliance

| Metric | Before | After Target | How to Verify |
|--------|--------|--------------|---------------|
| Cross-app imports | 3 violations | 0 violations | Run: `grep -r "from '../../projects" apps/tasks/` |
| `as any` casts in tasks app | 4 occurrences | 0 occurrences | Run: `grep -r "as any" apps/tasks/` |
| TypeScript strict mode errors | Unknown | 0 errors | Run: `pnpm typecheck:mono` |

#### Before State (Current)

```bash
# Boundary violations in apps/tasks/components/TasksPage.tsx
Line 7:  import TaskList from '../../projects/components/TaskList';
Line 8:  import AddBar from '../../projects/components/AddBar';
Line 9:  import { applyFilters } from '../../projects/utils/taskFilters';

# Type safety issues
Line 11: const TaskListAny = TaskList as any;
Line 66: applyFilters(tasks as any[], filters as string[], search)
Line 348: <TaskListAny ... />
```

#### After State (Target)

```bash
# Clean imports from shared packages
import { TaskList, AddBar } from '@myorg/ui';
import { applyFilters } from '@myorg/utils';
import type { TaskItem, TaskFilter } from '@myorg/types';

# No 'as any' casts
# All types properly defined
```

#### Verification Commands

```bash
# Check for boundary violations (should return empty)
grep -rn "from '../../projects" apps/tasks/
grep -rn "from '../../contacts" apps/tasks/
grep -rn "from '../../tasks" apps/projects/
grep -rn "from '../../tasks" apps/contacts/

# Check for 'as any' casts (should return empty)
grep -rn "as any" apps/tasks/
grep -rn "as any" apps/contacts/

# TypeScript check (should pass with 0 errors)
pnpm typecheck:mono
```

---

### 2. Shared Package Utilization

| Metric | Before | After Target | How to Verify |
|--------|--------|--------------|---------------|
| Types exported from `@myorg/types` | 0 | 10+ | Check `packages/types/src/index.ts` |
| Utils exported from `@myorg/utils` | 2 | 8+ | Check `packages/utils/src/index.ts` |
| Components in `@myorg/ui` | 1 | 10+ | Check `packages/ui/src/index.ts` |
| Apps using shared packages | 1 (contacts) | 4 (all) | Check imports in each app |

#### Before State (Current)

```
packages/types/src/index.ts:    3 exports (generic)
packages/utils/src/index.ts:    2 exports (invite, index)
packages/api-client/src/index.ts: 2 exports (contacts, index)
packages/ui/src/index.ts:       1 export (ui-button)
```

#### After State (Target)

```
packages/types/src/index.ts:    10+ exports (TaskItem, Project, Contact, etc.)
packages/utils/src/index.ts:    8+ exports (useAsyncState, taskFilters, etc.)
packages/api-client/src/index.ts: 4+ exports (contacts, tasks, projects, base)
packages/ui/src/index.ts:       10+ exports (Icon, TaskList, AddBar, etc.)
```

#### Verification Commands

```bash
# Count exports in each package
cat packages/types/src/index.ts | grep -c "export"
cat packages/utils/src/index.ts | grep -c "export"
cat packages/ui/src/index.ts | grep -c "export"

# Check which apps import from shared packages
grep -l "@myorg/types" apps/*/components/*.tsx
grep -l "@myorg/utils" apps/*/components/*.tsx
grep -l "@myorg/ui" apps/*/components/*.tsx
```

---

### 3. Code Duplication Reduction

| Metric | Before | After Target | How to Verify |
|--------|--------|--------------|---------------|
| Loading/error pattern duplication | 3 copies | 1 hook | Count `setLoading(true)` occurrences |
| Material icons inline usage | 17 occurrences | 0 occurrences | Count `className="material-icons"` |
| Empty state implementations | 3 different | 1 component | Check each app's empty state |

#### Before State (Current)

```bash
# Loading pattern - appears in 3 files with identical code
apps/tasks/components/TasksPage.tsx:    setLoading(true/false)
apps/projects/components/ProjectsPage.tsx: setLoading(true/false)
apps/contacts/components/ContactsPage.tsx: setLoading(true/false)

# Material icons - 17 inline occurrences
grep -c 'className="material-icons' apps/tasks/components/TasksPage.tsx     # 4
grep -c 'className="material-icons' apps/contacts/components/ContactsPage.tsx # 4
grep -c 'className="material-icons' apps/contacts/components/ContactCard.tsx  # 4
grep -c 'className="material-icons' apps/framework/components/*.tsx           # 5
```

#### After State (Target)

```bash
# Single useAsyncState hook usage
grep -c "useAsyncState" apps/*/components/*.tsx  # 3 (one per app)

# Icon component usage instead of inline
grep -c '<Icon name=' apps/*/components/*.tsx    # 17+
grep -c 'className="material-icons' apps/*/components/*.tsx  # 0
```

#### Verification Commands

```bash
# Count loading pattern duplication
grep -rn "setLoading(true)" apps/*/components/*.tsx | wc -l

# Count inline material-icons usage
grep -rn 'className="material-icons' apps/*/ | wc -l

# Count useAsyncState usage (should match number of apps)
grep -rn "useAsyncState" apps/*/components/*.tsx | wc -l
```

---

### 4. Build & Type Safety

| Metric | Before | After Target | How to Verify |
|--------|--------|--------------|---------------|
| `pnpm build:mono` | Passes | Passes | Run build command |
| `pnpm typecheck:mono` | Unknown | Passes (0 errors) | Run typecheck |
| `pnpm lint:mono` | Unknown | Passes (0 errors) | Run lint |

#### Verification Commands

```bash
# Full build verification
pnpm build:mono

# Type checking
pnpm typecheck:mono

# Linting
pnpm lint:mono
```

---

### 5. Runtime Verification

| Metric | Before | After Target | How to Verify |
|--------|--------|--------------|---------------|
| Tasks app loads | Works | Works | Manual test |
| Projects app loads | Works | Works | Manual test |
| Contacts app loads | Works | Works | Manual test |
| Tab navigation | Works | Works | Manual test |
| Task CRUD operations | Works | Works | Manual test |

#### Manual Test Checklist

```
[ ] Framework app loads at http://localhost:3001
[ ] Tasks tab shows task list
[ ] Can add new task
[ ] Can complete task (toggle)
[ ] Can delete task
[ ] Projects tab shows project list
[ ] Can create new project
[ ] Contacts tab shows contact list
[ ] Can add new contact
[ ] Tab switching works without page reload
[ ] Search in header works (when embedded)
```

---

## Implementation Phases with KPI Gates

### Phase 1: Types Package

**Before KPIs:**
- [ ] Document current types in each app (screenshot/code copy)

**After KPIs:**
- [ ] `packages/types/src/index.ts` exports 10+ types
- [ ] All apps import from `@myorg/types`
- [ ] `pnpm typecheck:mono` passes
- [ ] No runtime changes (types only)

**Gate:** Do not proceed to Phase 2 until all Phase 1 KPIs verified.

---

### Phase 2: Utils Package

**Before KPIs:**
- [ ] Count `setLoading(true)` occurrences (should be 3)
- [ ] Document current taskFilters location

**After KPIs:**
- [ ] `useAsyncState` hook created in `@myorg/utils`
- [ ] `taskFilters` moved to `@myorg/utils`
- [ ] `generateId` moved to `@myorg/utils`
- [ ] All apps updated to use shared utils
- [ ] `pnpm build:mono` passes
- [ ] Manual test: all apps still work

**Gate:** Do not proceed to Phase 3 until all Phase 2 KPIs verified.

---

### Phase 3: UI Components

**Before KPIs:**
- [ ] Count `className="material-icons"` occurrences (should be 17)
- [ ] Screenshot current empty states in each app

**After KPIs:**
- [ ] `Icon` component created
- [ ] `EmptyState` component created
- [ ] `DashboardCard` component created
- [ ] `LoadingSpinner` component created
- [ ] `ErrorMessage` component created
- [ ] All apps updated to use shared components
- [ ] `pnpm build:mono` passes
- [ ] Visual regression: UI looks identical

**Gate:** Do not proceed to Phase 4 until all Phase 3 KPIs verified.

---

### Phase 4: Fix Boundary Violation (Critical)

**Before KPIs:**
- [ ] Document boundary violations (3 imports)
- [ ] Document `as any` casts (4 occurrences)
- [ ] Screenshot tasks app working

**After KPIs:**
- [ ] `TaskList` moved to `@myorg/ui`
- [ ] `AddBar` moved to `@myorg/ui`
- [ ] Tasks app imports from `@myorg/ui` (not projects)
- [ ] Zero cross-app imports
- [ ] Zero `as any` casts in tasks app
- [ ] `pnpm typecheck:mono` passes with 0 errors
- [ ] Manual test: tasks app works identically

**Gate:** Phase 4 complete when all KPIs verified.

---

## Verification Checklist Template

Copy this template for each phase verification:

```markdown
## Phase X Verification - [Date]

### Pre-Implementation State
- Command: `[command]`
- Result: `[paste output]`
- Screenshot: `[if applicable]`

### Post-Implementation State
- Command: `[command]`
- Result: `[paste output]`
- Screenshot: `[if applicable]`

### KPI Results
| KPI | Target | Actual | Pass/Fail |
|-----|--------|--------|-----------|
| [metric] | [target] | [actual] | [P/F] |

### Manual Testing
- [ ] Test 1 passed
- [ ] Test 2 passed

### Decision
- [ ] APPROVED: Proceed to next phase
- [ ] REJECTED: Fix issues before proceeding

### Notes
[Any additional observations]
```

---

## Summary Dashboard

| Category | Before | After | Status |
|----------|--------|-------|--------|
| Boundary violations | 3 | 0 | 🔴 Pending |
| `as any` casts | 4 | 0 | 🔴 Pending |
| Shared types | 0 | 10+ | 🔴 Pending |
| Shared utils | 2 | 8+ | 🔴 Pending |
| Shared components | 1 | 10+ | 🔴 Pending |
| Code duplication | High | Low | 🔴 Pending |
| Build passes | ✅ | ✅ | 🟡 Verify after |
| Typecheck passes | ? | ✅ | 🔴 Pending |

---

## Next Steps

1. Review and approve this KPI document
2. Switch to Code mode to begin Phase 1 implementation
3. After each phase, return to this document to verify KPIs
4. Only commit after all KPIs for a phase are verified
