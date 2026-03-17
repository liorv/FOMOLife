export type FrameworkTab = 'tasks' | 'projects' | 'people';

export type FrameworkTabLink = {
  key: FrameworkTab;
  label: string;
  icon: string;
};

export const TAB_QUERY_ALIAS: Record<string, FrameworkTab> = {
  tasks: 'tasks',
  projects: 'projects',
  people: 'people',
  contacts: 'people',
  dreams: 'tasks',
};

export const TAB_ORDER: FrameworkTab[] = ['tasks', 'projects', 'people'];

export function getFrameworkTabLinks(): FrameworkTabLink[] {
  return [
    {
      key: 'tasks',
      label: 'Tasks',
      icon: 'check_circle',
    },
    {
      key: 'projects',
      label: 'Projects',
      icon: 'folder',
    },
    {
      key: 'people',
      label: 'Contacts',
      icon: 'contacts',
    },
  ];
}

export function normalizeTab(rawTab: string | string[] | undefined): FrameworkTab {
  const tabValue = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const normalized = tabValue ? TAB_QUERY_ALIAS[String(tabValue).toLowerCase()] : undefined;
  return normalized ?? 'tasks';
}
