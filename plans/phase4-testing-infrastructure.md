# Phase 4: Testing Infrastructure - Step-by-Step Implementation

**Purpose**: Add automated E2E testing with Playwright  
**Approach**: One small step at a time, verify each step before proceeding

---

## Overview

Phase 4 adds Playwright E2E testing to ensure app functionality is verified:
1. **4.1** Setup Playwright configuration
2. **4.2** Create authentication tests
3. **4.3** Create navigation tests
4. **4.4** Create CRUD operation tests
5. **4.5** Create mobile responsiveness tests

---

## Prerequisites Check

Before starting, verify current state:

```bash
# Check if Playwright is already installed
ls node_modules/@playwright/test 2>/dev/null || echo "Not installed"

# Check package.json for test scripts
cat package.json | grep -A 5 '"scripts"'
```

---

## Step 4.1: Setup Playwright

### Step 4.1.1: Install Playwright

**Action**: Install Playwright test runner

```bash
pnpm add -Dw @playwright/test
```

**Verification**:
```bash
ls node_modules/@playwright/test
```

**Status**: [ ] Not started

---

### Step 4.1.2: Install Browsers

**Action**: Install Playwright browsers

```bash
pnpm playwright install chromium
```

**Verification**:
```bash
ls ~/.cache/ms-playwright/
```

**Status**: [ ] Not started

---

### Step 4.1.3: Create playwright.config.ts

**File**: `playwright.config.ts`

**Action**: Create configuration file

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm turbo dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Verification**:
```bash
ls playwright.config.ts
```

**Status**: [ ] Not started

---

### Step 4.1.4: Create Test Directory Structure

**Action**: Create test directories

```bash
mkdir -p tests
```

**Verification**:
```bash
ls -la tests/
```

**Status**: [ ] Not started

---

## Step 4.2: Authentication Tests

### Step 4.2.1: Create auth.spec.ts

**File**: `tests/auth.spec.ts`

**Action**: Create authentication test file

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Sign in')).toBeVisible();
  });

  test('should handle Google login flow', async ({ page }) => {
    // Note: This is a simplified test - actual Google auth requires setup
    await page.goto('/login');
    await page.click('text=Google');
    // Verify redirect or error handling
  });
});
```

**Verification**:
```bash
ls tests/auth.spec.ts
```

**Status**: [ ] Not started

---

## Step 4.3: Navigation Tests

### Step 4.3.1: Create navigation.spec.ts

**File**: `tests/navigation.spec.ts`

**Action**: Create navigation test file

```typescript
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should switch between tabs', async ({ page }) => {
    await page.goto('/');
    
    // Click Tasks tab
    await page.click('text=Tasks');
    await expect(page.locator('main')).toContainText('Tasks');
    
    // Click Projects tab  
    await page.click('text=Projects');
    await expect(page.locator('main')).toContainText('Projects');
    
    // Click Contacts tab
    await page.click('text=Contacts');
    await expect(page.locator('main')).toContainText('Contacts');
  });

  test('should preserve URL state', async ({ page }) => {
    await page.goto('/projects?uid=test123');
    await expect(page.url()).toContain('uid=test123');
  });
});
```

**Verification**:
```bash
ls tests/navigation.spec.ts
```

**Status**: [ ] Not started

---

## Step 4.4: CRUD Operations Tests

### Step 4.4.1: Create tasks.spec.ts

**File**: `tests/tasks.spec.ts`

**Action**: Create tasks CRUD test file

```typescript
import { test, expect } from '@playwright/test';

test.describe('Tasks CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Go to tasks page
    await page.goto('/tasks');
  });

  test('should create a new task', async ({ page }) => {
    // Find add input and type task
    const addInput = page.locator('input[placeholder*="Add"]');
    await addInput.fill('Test Task');
    await addInput.press('Enter');
    
    // Verify task was created
    await expect(page.locator('text=Test Task')).toBeVisible();
  });

  test('should toggle task completion', async ({ page }) => {
    // Click checkbox to toggle
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.click();
    
    // Verify visual change
    await expect(checkbox).toBeChecked();
  });

  test('should delete a task', async ({ page }) => {
    // Find and click delete button
    const deleteBtn = page.locator('button:has(.material-icons), button:has-text("delete")').first();
    await deleteBtn.click();
    
    // Verify task is removed
    // Note: May show undo snackbar
  });
});
```

**Verification**:
```bash
ls tests/tasks.spec.ts
```

**Status**: [ ] Not started

---

### Step 4.4.2: Create projects.spec.ts

**File**: `tests/projects.spec.ts`

**Action**: Create projects CRUD test file

```typescript
import { test, expect } from '@playwright/test';

test.describe('Projects CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
  });

  test('should create a new project', async ({ page }) => {
    // Click add button
    await page.click('button:has(.material-icons), button:has-text("add")');
    
    // Fill in project name
    await page.fill('input[placeholder*="Project"], input[name="name"]', 'Test Project');
    await page.click('button:has-text("Create"), button:has-text("Add")');
    
    // Verify project was created
    await expect(page.locator('text=Test Project')).toBeVisible();
  });

  test('should edit a project', async ({ page }) => {
    // Click on project to select
    await page.click('.project-tile, text=Existing Project');
    
    // Edit project name
    await page.click('.project-name, [contenteditable]');
    await page.fill('input', 'Updated Project');
    await page.keyboard.press('Enter');
    
    // Verify update
    await expect(page.locator('text=Updated Project')).toBeVisible();
  });
});
```

**Verification**:
```bash
ls tests/projects.spec.ts
```

**Status**: [ ] Not started

---

## Step 4.5: Mobile Responsiveness Tests

### Step 4.5.1: Create mobile.spec.ts

**File**: `tests/mobile.spec.ts`

**Action**: Create mobile responsiveness test file

```typescript
import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test('should render correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/tasks');
    
    // Verify layout adapts
    await expect(page.locator('main')).toBeVisible();
  });

  test('should have touch-friendly interactions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/tasks');
    
    // Verify buttons are large enough for touch
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });
});
```

**Verification**:
```bash
ls tests/mobile.spec.ts
```

**Status**: [ ] Not started

---

## Step 4.6: Final Verification

### Step 4.6.1: Run All Tests

**Action**: Run full test suite

```bash
pnpm playwright test
```

**Expected Results**:
- [ ] All tests pass
- [ ] HTML report generated

**Status**: [ ] Not started

---

### Step 4.6.2: Add CI Integration

**File**: `.github/workflows/test.yml`

**Action**: Add GitHub Actions workflow

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm playwright test
```

**Verification**:
```bash
ls .github/workflows/test.yml
```

**Status**: [ ] Not started

---

## Success Criteria for Phase 4

| Criteria | Verification |
|----------|--------------|
| Playwright installed | `ls node_modules/@playwright/test` |
| Config created | `ls playwright.config.ts` |
| Auth tests exist | `ls tests/auth.spec.ts` |
| Navigation tests exist | `ls tests/navigation.spec.ts` |
| CRUD tests exist | `ls tests/tasks.spec.ts`, `tests/projects.spec.ts` |
| Mobile tests exist | `ls tests/mobile.spec.ts` |
| Tests pass | `pnpm playwright test` exits 0 |
| CI configured | `ls .github/workflows/test.yml` |

---

## Next Phase

After Phase 4 is verified complete, proceed to:
- **Phase 5**: Future Features (Mobile-first redesign, Bottom-sheet editor, AI-assisted breakdown)

---

## Notes

- Tests can be run locally with `pnpm playwright test`
- Use `pnpm playwright test --ui` for interactive test running
- Tests require dev server to be running or configured in playwright.config.ts
