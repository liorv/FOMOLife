# Phase 1: Types Package - Step-by-Step Implementation

**Purpose**: Create shared type definitions in `@myorg/types` package  
**Approach**: One small step at a time, verify each step before proceeding

---

## Overview

Phase 1 creates shared TypeScript type definitions that will be used across all apps. This is the lowest-risk phase because:
- Types have no runtime impact
- Changes are purely additive
- Easy to verify with TypeScript compiler

---

## Prerequisites Check

Before starting, verify current state:

```bash
# Check current types package structure
ls -la packages/types/src/

# Check current exports
cat packages/types/src/index.ts

# Verify TypeScript compiles
pnpm typecheck:mono
```

---

## Step 1.1: Create TaskItem Type

**File**: `packages/types/src/task.ts`

**Action**: Create new file with TaskItem interface

**Verification**:
```bash
# File exists
ls packages/types/src/task.ts

# TypeScript valid
pnpm --filter @myorg/types typecheck
```

**Status**: [ ] Not started

---

## Step 1.2: Create Project Types

**File**: `packages/types/src/project.ts`

**Action**: Create new file with Project and Subproject interfaces

**Verification**:
```bash
# File exists
ls packages/types/src/project.ts

# TypeScript valid
pnpm --filter @myorg/types typecheck
```

**Status**: [ ] Not started

---

## Step 1.3: Create Contact Types

**File**: `packages/types/src/contact.ts`

**Action**: Create new file with Contact interface

**Verification**:
```bash
# File exists
ls packages/types/src/contact.ts

# TypeScript valid
pnpm --filter @myorg/types typecheck
```

**Status**: [ ] Not started

---

## Step 1.4: Create Common Types

**File**: `packages/types/src/common.ts`

**Action**: Create shared utility types (AsyncState, Result, etc.)

**Verification**:
```bash
# File exists
ls packages/types/src/common.ts

# TypeScript valid
pnpm --filter @myorg/types typecheck
```

**Status**: [ ] Not started

---

## Step 1.5: Update Barrel Export

**File**: `packages/types/src/index.ts`

**Action**: Export all types from barrel file

**Verification**:
```bash
# Check exports
cat packages/types/src/index.ts

# Should show exports from all type files
pnpm --filter @myorg/types typecheck
```

**Status**: [ ] Not started

---

## Step 1.6: Update Package Exports

**File**: `packages/types/package.json`

**Action**: Add proper exports field for ESM/CommonJS

**Verification**:
```bash
# Check package.json
cat packages/types/package.json

# Verify build
pnpm --filter @myorg/types build
```

**Status**: [ ] Not started

---

## Step 1.7: Update Contacts App to Use Shared Types

**File**: `apps/contacts/components/ContactsPage.tsx`

**Action**: Replace local Contact type with import from `@myorg/types`

**Before**:
```typescript
import type { Contact } from '@myorg/types';  // Already using this
```

**Verification**:
```bash
# TypeScript check
pnpm --filter contacts typecheck

# App still builds
pnpm --filter contacts build
```

**Status**: [ ] Not started (may already be done)

---

## Step 1.8: Update Tasks App to Use Shared Types

**File**: `apps/tasks/components/TasksPage.tsx`

**Action**: Replace local TaskItem type with import from `@myorg/types`

**Before**:
```typescript
import type { TaskItem } from '@/lib/server/tasksStore';
```

**After**:
```typescript
import type { TaskItem } from '@myorg/types';
```

**Verification**:
```bash
# TypeScript check
pnpm --filter tasks typecheck

# App still builds
pnpm --filter tasks build
```

**Status**: [ ] Not started

---

## Step 1.9: Update Projects App to Use Shared Types

**Files**: Multiple files in `apps/projects/`

**Action**: Replace local types with imports from `@myorg/types`

**Verification**:
```bash
# TypeScript check
pnpm --filter projects typecheck

# App still builds
pnpm --filter projects build
```

**Status**: [ ] Not started

---

## Step 1.10: Final Verification

**Action**: Run all verification commands

**Commands**:
```bash
# Full monorepo typecheck
pnpm typecheck:mono

# Full monorepo build
pnpm build:mono

# Count exports (should be 10+)
cat packages/types/src/index.ts | grep -c "export"

# Verify all apps can import types
grep -r "@myorg/types" apps/*/components/*.tsx
```

**Expected Results**:
- [ ] `pnpm typecheck:mono` passes with 0 errors
- [ ] `pnpm build:mono` passes
- [ ] Types package exports 10+ types
- [ ] All 4 apps import from `@myorg/types`

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

## Success Criteria for Phase 1

Phase 1 is complete when:

| Criteria | Verification |
|----------|--------------|
| All type files created | `ls packages/types/src/*.ts` shows 5 files |
| Barrel export updated | `cat packages/types/src/index.ts` shows all exports |
| All apps use shared types | `grep -r "@myorg/types" apps/*/` shows imports |
| TypeScript passes | `pnpm typecheck:mono` exits 0 |
| Build passes | `pnpm build:mono` exits 0 |
| No runtime changes | Apps work identically |

---

## Next Phase

After Phase 1 is verified complete, proceed to:
- **Phase 2**: Utils Package (useAsyncState, taskFilters, generateId)

---

## Notes

- Each step should take only a few minutes
- Verify thoroughly before proceeding
- Document any issues encountered
- No commits until entire phase is verified
