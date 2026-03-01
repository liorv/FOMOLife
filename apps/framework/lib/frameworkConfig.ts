export type FrameworkTab = 'tasks' | 'projects' | 'people';

export type FrameworkTabLink = {
  key: FrameworkTab;
  label: string;
  icon: string;
  href: string | undefined;
};

export const TAB_QUERY_ALIAS: Record<string, FrameworkTab> = {
  tasks: 'tasks',
  projects: 'projects',
  people: 'people',
  contacts: 'people',
  dreams: 'tasks',
};

export const TAB_ORDER: FrameworkTab[] = ['tasks', 'projects', 'people'];

function resolveTabHref(explicitHref: string | undefined, devFallbackHref: string): string | undefined {
  if (explicitHref && explicitHref.trim()) {
    return explicitHref;
  }

  return process.env.NODE_ENV === 'production' ? undefined : devFallbackHref;
}

export function getFrameworkTabLinks(): FrameworkTabLink[] {
  return [
    {
      key: 'tasks',
      label: 'Tasks',
      icon: 'check_circle',
      href: resolveTabHref(process.env.NEXT_PUBLIC_TASKS_APP_URL, 'http://localhost:3004'),
    },
    {
      key: 'projects',
      label: 'Projects',
      icon: 'folder',
      href: resolveTabHref(process.env.NEXT_PUBLIC_PROJECTS_APP_URL, 'http://localhost:3003'),
    },
    {
      key: 'people',
      label: 'Contacts',
      icon: 'contacts',
      href: resolveTabHref(process.env.NEXT_PUBLIC_CONTACTS_APP_URL, 'http://localhost:3002'),
    },
  ];
}

export function normalizeTab(rawTab: string | string[] | undefined): FrameworkTab {
  const tabValue = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const normalized = tabValue ? TAB_QUERY_ALIAS[String(tabValue).toLowerCase()] : undefined;
  return normalized ?? 'tasks';
}
