# Phase 3: CSS Architecture - Step-by-Step Implementation

**Purpose**: Replace inline styles and split monolithic CSS files into maintainable modules  
**Approach**: One small step at a time, verify each step before proceeding

---

## Overview

Phase 3 addresses CSS architecture issues:
1. **3.1 Replace Inline Styles** - Extract inline styles from TasksPage.tsx
2. **3.2 Split Legacy CSS Files** - Break down projects.css (39KB) and tabs.css (32KB)

---

## Prerequisites Check

Before starting, verify current state:

```bash
# Check current CSS structure
ls -la apps/projects/styles/

# Check TasksPage for inline styles
grep -n "style={" apps/tasks/components/TasksPage.tsx

# Check CSS file sizes
wc -c apps/projects/styles/*.css
```

---

## Step 3.1: Replace Inline Styles in TasksPage

### Step 3.1.1: Identify Inline Styles in TasksPage

**Action**: Document all inline styles in TasksPage.tsx

**Verification**:
```bash
grep -n "style={" apps/tasks/components/TasksPage.tsx | head -20
```

**Status**: [ ] Not started

---

### Step 3.1.2: Create TasksPage Module CSS

**File**: `apps/tasks/components/TasksPage.module.css`

**Action**: Create CSS module file with extracted styles

**Verification**:
```bash
ls apps/tasks/components/TasksPage.module.css
```

**Status**: [ ] Not started

---

### Step 3.1.3: Replace Inline Styles with CSS Module Classes

**File**: `apps/tasks/components/TasksPage.tsx`

**Action**: Replace inline style objects with CSS module class names

**Before**:
```tsx
<div style={{ padding: '16px', background: '#fff' }}>
```

**After**:
```tsx
<div className={styles.container}>
```

**Verification**:
```bash
# No inline styles should remain
grep -c "style={" apps/tasks/components/TasksPage.tsx
# Should be 0
```

**Status**: [ ] Not started

---

## Step 3.2: Split Legacy CSS Files

### Step 3.2.1: Analyze projects.css Structure

**File**: `apps/projects/styles/projects.css`

**Action**: Identify logical sections in the 39KB file

**Sections to extract**:
- ProjectTile styles
- ProjectEditor styles
- SubprojectRow styles

**Verification**:
```bash
# Count CSS rules by component
grep -c "\.ProjectTile" apps/projects/styles/projects.css
grep -c "\.ProjectEditor" apps/projects/styles/projects.css
grep -c "\.SubprojectRow" apps/projects/styles/projects.css
```

**Status**: [ ] Not started

---

### Step 3.2.2: Create ProjectTile.module.css

**File**: `apps/projects/styles/components/ProjectTile.module.css`

**Action**: Extract ProjectTile styles from projects.css

**Verification**:
```bash
ls apps/projects/styles/components/ProjectTile.module.css
```

**Status**: [ ] Not started

---

### Step 3.2.3: Create ProjectEditor.module.css

**File**: `apps/projects/styles/components/ProjectEditor.module.css`

**Action**: Extract ProjectEditor styles from projects.css

**Verification**:
```bash
ls apps/projects/styles/components/ProjectEditor.module.css
```

**Status**: [ ] Not started

---

### Step 3.2.4: Create SubprojectRow.module.css

**File**: `apps/projects/styles/components/SubprojectRow.module.css`

**Action**: Extract SubprojectRow styles from projects.css

**Verification**:
```bash
ls apps/projects/styles/components/SubprojectRow.module.css
```

**Status**: [ ] Not started

---

### Step 3.2.5: Create Layout.module.css

**File**: `apps/projects/styles/layout.module.css`

**Action**: Extract shared layout styles from projects.css

**Verification**:
```bash
ls apps/projects/styles/layout.module.css
```

**Status**: [ ] Not started

---

### Step 3.2.6: Update Projects App Components to Use CSS Modules

**Files**: 
- `apps/projects/components/ProjectTile.tsx`
- `apps/projects/components/ProjectEditor.tsx`
- `apps/projects/components/SubprojectRow.tsx`

**Action**: Import and use CSS module classes instead of global CSS

**Before**:
```tsx
<div className="project-tile">
```

**After**:
```tsx
import styles from '../styles/components/ProjectTile.module.css';
// ...
<div className={styles.tile}>
```

**Verification**:
```bash
# Check for CSS module imports
grep -l "import.*\.module\.css" apps/projects/components/*.tsx
```

**Status**: [ ] Not started

---

### Step 3.2.7: Analyze tabs.css Structure

**File**: `apps/projects/styles/tabs.css`

**Action**: Identify logical sections in the 32KB file

**Sections to extract**:
- TabNav styles
- TabContent styles
- Animations

**Verification**:
```bash
grep -c "\.TabNav" apps/projects/styles/tabs.css
grep -c "\.TabContent" apps/projects/styles/tabs.css
```

**Status**: [ ] Not started

---

### Step 3.2.8: Create TabNav.module.css

**File**: `apps/projects/styles/components/TabNav.module.css`

**Action**: Extract TabNav styles from tabs.css

**Verification**:
```bash
ls apps/projects/styles/components/TabNav.module.css
```

**Status**: [ ] Not started

---

### Step 3.2.9: Create TabContent.module.css

**File**: `apps/projects/styles/components/TabContent.module.css`

**Action**: Extract TabContent styles from tabs.css

**Verification**:
```bash
ls apps/projects/styles/components/TabContent.module.css
```

**Status**: [ ] Not started

---

### Step 3.2.10: Create Animations.module.css

**File**: `apps/projects/styles/shared/animations.module.css`

**Action**: Extract animation keyframes from tabs.css

**Verification**:
```bash
ls apps/projects/styles/shared/animations.module.css
```

**Status**: [ ] Not started

---

### Step 3.2.11: Remove Original Legacy CSS Files

**Files**:
- `apps/projects/styles/projects.css`
- `apps/projects/styles/tabs.css`

**Action**: Delete legacy CSS files after all styles are migrated

**Verification**:
```bash
ls apps/projects/styles/*.css
# Should only show .module.css files
```

**Status**: [ ] Not started

---

## Step 3.3: Final Verification

**Action**: Run all verification commands

**Commands**:
```bash
# No inline styles in components
grep -r "style={" apps/*/components/*.tsx | wc -l
# Should be 0

# CSS file sizes under 10KB
wc -c apps/projects/styles/**/*.module.css
# All should be under 10KB

# Build succeeds
pnpm turbo build --filter=projects --filter=tasks
```

**Expected Results**:
- [ ] No inline styles in any component
- [ ] All CSS files under 10KB
- [ ] All apps build successfully

**Status**: [ ] Not started

---

## Success Criteria for Phase 3

| Criteria | Verification |
|----------|--------------|
| No inline styles | `grep -r "style={" apps/*/components` returns nothing |
| projects.css split | File removed, component modules exist |
| tabs.css split | File removed, component modules exist |
| Build passes | `pnpm turbo build` succeeds |

---

## CSS File Target Structure

```
apps/projects/styles/
├── components/
│   ├── ProjectTile.module.css
│   ├── ProjectEditor.module.css
│   ├── SubprojectRow.module.css
│   ├── TabNav.module.css
│   └── TabContent.module.css
├── layout.module.css
└── shared/
    └── animations.module.css
```

---

## Next Phase

After Phase 3 is verified complete, proceed to:
- **Phase 4**: Testing Infrastructure (Playwright E2E Tests)
- **Phase 5**: Future Features (Mobile-first redesign, Bottom-sheet editor)

---

## Notes

- Steps 3.2.1-3.2.11 can be done in parallel for different components
- Keep legacy CSS until new module is verified working
- Run build after each component migration
