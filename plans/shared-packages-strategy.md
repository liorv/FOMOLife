# Shared Packages Strategy

**Created**: 2026-03-01  
**Purpose**: Define comprehensive strategy for sharing code and components across FOMO Life apps

---

## Current State Analysis

### Existing Packages

| Package | Current Contents | Utilization |
|---------|-----------------|-------------|
| `@myorg/types` | Minimal index.ts | Underutilized |
| `@myorg/utils` | `invite.ts`, `index.ts` | Underutilized |
| `@myorg/api-client` | `contacts.ts`, `index.ts` | Partial |
| `@myorg/ui` | `ui-button.tsx`, `styles.css` | Skeleton |

### Common Patterns Identified

Through code analysis, I identified these repeated patterns across apps:

#### 1. Loading/Error State Management
Found in all 3 apps with identical implementation:

```typescript
// Repeated in TasksPage, ProjectsPage, ContactsPage
const [loading, setLoading] = useState(true);
const [errorMessage, setErrorMessage] = useState<string | null>(null);

useEffect(() => {
  let active = true;
  (async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const loaded = await api.list();
      if (active) setData(loaded);
    } catch (error) {
      if (active) setErrorMessage(error instanceof Error ? error.message : 'Failed to load');
    } finally {
      if (active) setLoading(false);
    }
  })();
  return () => { active = false; };
}, [api]);
```

#### 2. Material Icons Usage
17 occurrences across apps using `<span className="material-icons">`:

| App | Icons Used |
|-----|-----------|
| Tasks | check_circle, star, warning, upcoming |
| Contacts | close, person_add, link, check, add_link, people |
| Framework | search, logout, switch_account |
| Projects | (many more in JS files) |

#### 3. Empty State UI
Similar empty state patterns in all apps:

```typescript
// TasksPage
{filtered.length === 0 ? (
  <p className="filter-flat-empty">{emptyMessage()}</p>
) : ...}

// ContactsPage
{contacts.length === 0 ? (
  <div className={styles.empty}>
    <span className="material-icons">people</span>
    <p>No contacts yet.</p>
  </div>
) : ...}
```

#### 4. Dashboard Cards
TasksPage has 4 dashboard cards (Completed, Starred, Overdue, Upcoming) that could be a reusable component.

#### 5. Read-Only Mode Notice
Identical pattern in all apps:

```typescript
{!canManage ? <div>Read-only mode: sign in is required...</div> : null}
```

---

## Proposed Package Structure

```
packages/
├── types/                          # Shared TypeScript types
│   ├── src/
│   │   ├── task.ts                 # TaskItem, TaskFilter, TaskCreateInput
│   │   ├── project.ts              # Project, Subproject, ProjectFilter
│   │   ├── contact.ts              # Contact, ContactStatus
│   │   ├── user.ts                 # User, UserProfile
│   │   ├── api.ts                  # ApiClient interfaces
│   │   ├── common.ts               # Shared types (AsyncState, Result)
│   │   └── index.ts                # Barrel export
│   └── package.json
│
├── utils/                          # Shared utilities
│   ├── src/
│   │   ├── async/
│   │   │   ├── useAsyncState.ts    # Hook for loading/error state
│   │   │   └── retry.ts            # Retry logic
│   │   ├── filters/
│   │   │   ├── taskFilters.ts      # Task filtering logic
│   │   │   └── projectFilters.ts   # Project filtering logic
│   │   ├── invite/
│   │   │   └── invite.ts           # Existing invite utilities
│   │   ├── validation/
│   │   │   ├── strings.ts          # isNonEmptyString, etc.
│   │   │   └── dates.ts            # Date utilities
│   │   ├── id/
│   │   │   └── generateId.ts       # ID generation
│   │   └── index.ts
│   └── package.json
│
├── api-client/                     # Shared API clients
│   ├── src/
│   │   ├── base/
│   │   │   ├── ApiClient.ts        # Base client class
│   │   │   └── types.ts            # API types
│   │   ├── contacts/
│   │   │   └── contacts.ts         # Existing contacts client
│   │   ├── tasks/
│   │   │   └── tasks.ts            # Tasks client
│   │   ├── projects/
│   │   │   └── projects.ts         # Projects client
│   │   └── index.ts
│   └── package.json
│
└── ui/                             # Shared UI components
    ├── src/
    │   ├── icons/
    │   │   ├── Icon.tsx            # Material icons wrapper
    │   │   └── index.ts
    │   ├── feedback/
    │   │   ├── LoadingSpinner.tsx  # Loading indicator
    │   │   ├── ErrorMessage.tsx    # Error display
    │   │   ├── EmptyState.tsx      # Empty state component
    │   │   ├── Banner.tsx          # Info/success/warning banners
    │   │   └── index.ts
    │   ├── layout/
    │   │   ├── DashboardCard.tsx   # Stat card with icon
    │   │   ├── PageShell.tsx       # Page wrapper with loading/error
    │   │   └── index.ts
    │   ├── inputs/
    │   │   ├── AddBar.tsx          # Add input bar
    │   │   ├── SearchInput.tsx     # Search field
    │   │   └── index.ts
    │   ├── lists/
    │   │   ├── TaskList.tsx        # Generic task list
    │   │   ├── TaskRow.tsx         # Task row item
    │   │   └── index.ts
    │   ├── buttons/
    │   │   ├── Button.tsx          # Base button
    │   │   ├── IconButton.tsx      # Icon-only button
    │   │   └── index.ts
    │   ├── styles/
    │   │   ├── variables.css       # CSS custom properties
    │   │   ├── reset.css           # CSS reset
    │   │   └── index.css           # Combined exports
    │   └── index.ts                # Barrel export
    └── package.json
```

---

## Component Specifications

### 1. Icon Component

Replace all `<span className="material-icons">` with a typed component:

```typescript
// packages/ui/src/icons/Icon.tsx
export type IconName = 
  | 'check_circle' | 'star' | 'warning' | 'upcoming'
  | 'close' | 'person_add' | 'link' | 'check' | 'add_link' | 'people'
  | 'search' | 'logout' | 'switch_account' | 'folder' | 'contacts'
  | 'edit' | 'delete' | 'add' | 'more_vert';

export interface IconProps {
  name: IconName;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
}

export function Icon({ name, size = 'md', className, ariaLabel }: IconProps) {
  return (
    <span 
      className={`material-icons icon--${size} ${className ?? ''}`.trim()}
      aria-hidden={!ariaLabel}
      aria-label={ariaLabel}
    >
      {name}
    </span>
  );
}
```

### 2. useAsyncState Hook

Extract the repeated loading/error pattern:

```typescript
// packages/utils/src/async/useAsyncState.ts
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsyncState<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = []
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const data = await fetcher();
        if (active) setState({ data, loading: false, error: null });
      } catch (error) {
        if (active) {
          setState({ 
            data: null, 
            loading: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    })();
    return () => { active = false; };
  }, deps);

  const refetch = () => setState(prev => ({ ...prev, loading: true }));
  
  return { ...state, refetch };
}
```

### 3. DashboardCard Component

Extract the stat cards from TasksPage:

```typescript
// packages/ui/src/layout/DashboardCard.tsx
export interface DashboardCardProps {
  icon: IconName;
  value: string | number;
  label: string;
  variant: 'success' | 'star' | 'danger' | 'info';
  active?: boolean;
  onClick?: () => void;
}

export function DashboardCard({ 
  icon, value, label, variant, active, onClick 
}: DashboardCardProps) {
  return (
    <div
      className={[
        'dashboard-card',
        `dashboard-card--${variant}`,
        onClick ? 'dashboard-card--clickable' : '',
        active ? 'dashboard-card--active' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Icon name={icon} className="dashboard-card__icon" />
      <div className="dashboard-card__body">
        <span className="dashboard-card__value">{value}</span>
        <span className="dashboard-card__label">{label}</span>
      </div>
      {active && <span className="dashboard-card__active-dot" />}
    </div>
  );
}
```

### 4. EmptyState Component

Unified empty state across apps:

```typescript
// packages/ui/src/feedback/EmptyState.tsx
export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <Icon name={icon} size="lg" className="empty-state__icon" />}
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
```

### 5. PageShell Component

Combine loading, error, and read-only states:

```typescript
// packages/ui/src/layout/PageShell.tsx
export interface PageShellProps {
  loading?: boolean;
  error?: string | null;
  canManage?: boolean;
  readOnlyMessage?: string;
  children: React.ReactNode;
}

export function PageShell({ 
  loading, error, canManage = true, readOnlyMessage, children 
}: PageShellProps) {
  return (
    <main className="page-shell">
      {!canManage && (
        <div className="page-shell__notice">
          {readOnlyMessage || 'Read-only mode: sign in is required.'}
        </div>
      )}
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && children}
    </main>
  );
}
```

---

## Migration Strategy

### Phase 1: Types Package (Low Risk)

1. Create type definitions in `packages/types/src/`
2. Export from barrel file
3. Update apps to import from `@myorg/types`
4. No runtime impact, pure TypeScript

### Phase 2: Utils Package (Low Risk)

1. Create `useAsyncState` hook
2. Move `taskFilters` from projects app
3. Move `generateId` from projects app
4. Update imports in apps

### Phase 3: UI Package (Medium Risk)

1. Create Icon component
2. Create EmptyState, LoadingSpinner, ErrorMessage
3. Create DashboardCard
4. Create PageShell
5. Gradually replace inline usage in apps

### Phase 4: Extract Shared Components (High Impact)

1. Move TaskList to `packages/ui`
2. Move AddBar to `packages/ui`
3. Convert to TypeScript with proper types
4. Update tasks app to use from package (fixes boundary violation)

---

## Import Examples

### Before (Current State)

```typescript
// apps/tasks/components/TasksPage.tsx - BOUNDARY VIOLATION
import TaskList from '../../projects/components/TaskList';
import AddBar from '../../projects/components/AddBar';
import { applyFilters } from '../../projects/utils/taskFilters';

// Inline loading/error pattern
const [loading, setLoading] = useState(true);
const [errorMessage, setErrorMessage] = useState<string | null>(null);
// ... 20+ lines of useEffect boilerplate
```

### After (With Shared Packages)

```typescript
// apps/tasks/components/TasksPage.tsx - CLEAN IMPORTS
import { TaskList, AddBar, DashboardCard, EmptyState, PageShell } from '@myorg/ui';
import { useAsyncState } from '@myorg/utils';
import { applyFilters } from '@myorg/utils';
import type { TaskItem, TaskFilter } from '@myorg/types';

// Clean async state
const { data: tasks, loading, error } = useAsyncState(
  () => api.listTasks(),
  [api]
);
```

---

## Benefits Summary

| Benefit | Impact |
|---------|--------|
| Fix boundary violation | Critical - enables proper architecture |
| Reduce code duplication | ~30% reduction in page components |
| Consistent UX | Same loading/error/empty states |
| Type safety | Shared types prevent mismatches |
| Easier maintenance | Single source of truth for components |
| Faster development | Pre-built components for new features |

---

## Package Dependencies

```json
// packages/ui/package.json
{
  "dependencies": {
    "@myorg/types": "workspace:*",
    "@myorg/utils": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}

// packages/utils/package.json
{
  "dependencies": {
    "@myorg/types": "workspace:*"
  }
}

// packages/api-client/package.json
{
  "dependencies": {
    "@myorg/types": "workspace:*"
  }
}
```

---

## Next Steps

1. **Immediate**: Create type definitions in `@myorg/types`
2. **Short-term**: Create `useAsyncState` hook and move utilities
3. **Medium-term**: Build UI components (Icon, EmptyState, DashboardCard)
4. **Critical**: Move TaskList/AddBar to fix boundary violation

Switch to Code mode to begin implementation.
