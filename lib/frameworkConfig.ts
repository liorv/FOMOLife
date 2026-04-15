export type FrameworkTab = 'tasks' | 'projects' | 'people' | 'feedback';

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
  feedback: 'feedback',
  requests: 'feedback',
};

export const TAB_ORDER: FrameworkTab[] = ['tasks', 'projects', 'people', 'feedback'];

export function getFrameworkTabLinks(): FrameworkTabLink[] {
  return [
    {
      key: 'tasks',
      label: 'Home',
      icon: 'home',
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
    {
      key: 'feedback',
      label: 'Feedback',
      icon: 'forum',
    },
  ];
}

export function normalizeTab(rawTab: string | string[] | undefined): FrameworkTab {
  const tabValue = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const normalized = tabValue ? TAB_QUERY_ALIAS[String(tabValue).toLowerCase()] : undefined;
  return normalized ?? 'tasks';
}
