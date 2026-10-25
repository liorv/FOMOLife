import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { ProjectItem } from '@myorg/types';
import ProjectsPage from '../ProjectsPage';
import type ProjectsDashboard from '../ProjectsDashboard';

let mockSearchParams = new URLSearchParams('tab=projects');
const mockPush = jest.fn();
let historyPush: jest.SpyInstance;
let mockDashboardProps: ComponentProps<typeof ProjectsDashboard>;
const mockProject: ProjectItem = {
  id: 'project / one',
  text: 'Shared project',
  color: '#1976D2',
  avatarUrl: '/project.svg',
  subprojects: [{ id: 'section / one', text: 'Launch', collapsed: true, tasks: [] }],
};
const mockListProjects = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => '/',
}));
jest.mock('@myorg/api-client', () => ({
  createProjectsApiClient: () => ({ listProjects: mockListProjects }),
  createContactsApiClient: () => ({ listContacts: async () => [] }),
  createTasksApiClient: () => ({ listTasks: async () => [] }),
}));
jest.mock('@/lib/client/contactsCache', () => ({
  getCachedContacts: async () => [],
  getContactsCacheAge: () => 0,
}));
jest.mock('@/lib/client/projectsCache', () => ({
  getCachedProjectsSync: () => null,
  setCachedProjects: jest.fn(),
  areProjectsStale: () => false,
  invalidateProjectsCache: jest.fn(),
}));
jest.mock('../../ConversationThread', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProjectsDashboard', () => ({
  __esModule: true,
  default: (props: ComponentProps<typeof ProjectsDashboard>) => {
    mockDashboardProps = props;
    return <button onClick={() => props.onSelectProject?.(mockProject.id)}>Open project</button>;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockSearchParams = new URLSearchParams('tab=projects');
  mockListProjects.mockResolvedValue([mockProject]);
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ feedback: [] }) } as Response);
  const pushState = window.history.pushState.bind(window.history);
  historyPush = jest.spyOn(window.history, 'pushState').mockImplementation((data, unused, url) => {
    pushState(data, unused, url);
    // Next.js syncs native history changes with useSearchParams without a server request.
    mockSearchParams = new URL(String(url), 'http://localhost').searchParams;
  });
});

afterEach(() => jest.restoreAllMocks());

async function openPage() {
  const page = render(<ProjectsPage canManage />);
  await waitFor(() => expect(mockDashboardProps.projects).toEqual([mockProject]));
  return page;
}

function lastNavigation() {
  expect(mockPush).toHaveBeenLastCalledWith(expect.any(String), { scroll: false });
  return new URL(mockPush.mock.calls.at(-1)![0], 'https://fomo.test');
}

it('writes a stable encoded project URL and removes stale search and notification targets without a server navigation', async () => {
  mockSearchParams = new URLSearchParams('tab=projects&q=find&threadId=old&taskId=old&feedbackId=old&view=plan&subprojectId=old');
  mockSearchParams.set('projectId', mockProject.id);
  await openPage();
  fireEvent.click(screen.getByRole('button', { name: 'Open project' }));
  expect(historyPush).toHaveBeenLastCalledWith(null, '', expect.any(String));
  const url = new URL(String(historyPush.mock.calls.at(-1)![2]), 'https://fomo.test');
  expect(url.pathname).toBe('/');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    tab: 'projects', projectId: mockProject.id,
  });
  expect(mockPush).not.toHaveBeenCalled();
});

it.each(['tasks', 'plan', 'roadmap', 'risks'] as const)('restores the %s view from a shared URL', async view => {
  mockSearchParams.set('projectId', mockProject.id);
  mockSearchParams.set('view', view);
  await openPage();
  expect(mockDashboardProps.selectedProjectId).toBe(mockProject.id);
  expect(mockDashboardProps.selectedWorkspaceView).toBe(view);
  expect(mockPush).not.toHaveBeenCalled();
});

it('updates workspace and section URLs without waiting for a server navigation', async () => {
  mockSearchParams.set('projectId', mockProject.id);
  const page = await openPage();
  act(() => mockDashboardProps.onWorkspaceChange?.('roadmap'));
  page.rerender(<ProjectsPage canManage />);
  expect(mockDashboardProps.selectedWorkspaceView).toBe('roadmap');
  let url = new URL(String(historyPush.mock.calls.at(-1)![2]), 'https://fomo.test');
  expect(url.searchParams.get('view')).toBe('roadmap');
  expect(url.searchParams.get('projectId')).toBe(mockProject.id);
  act(() => mockDashboardProps.onSelectSubproject?.('section / one'));
  page.rerender(<ProjectsPage canManage />);
  expect(mockDashboardProps.selectedWorkspaceView).toBe('tasks');
  expect(mockDashboardProps.selectedSubprojectId).toBe('section / one');
  url = new URL(String(historyPush.mock.calls.at(-1)![2]), 'https://fomo.test');
  expect(url.searchParams.get('subprojectId')).toBe('section / one');
  expect(url.searchParams.has('view')).toBe(false);
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockListProjects).toHaveBeenCalledTimes(1);
});

it('restores browser Back/Forward URL changes, including returning to the project list', async () => {
  mockSearchParams.set('projectId', mockProject.id);
  mockSearchParams.set('view', 'plan');
  const page = await openPage();
  mockSearchParams = new URLSearchParams('tab=projects');
  page.rerender(<ProjectsPage canManage />);
  expect(mockDashboardProps.selectedProjectId).toBeNull();
  expect(mockDashboardProps.selectedWorkspaceView).toBe('tasks');
  mockSearchParams = new URLSearchParams({ tab: 'projects', projectId: mockProject.id, subprojectId: 'section / one' });
  page.rerender(<ProjectsPage canManage />);
  expect(mockDashboardProps.selectedProjectId).toBe(mockProject.id);
  expect(mockDashboardProps.selectedSubprojectId).toBe('section / one');
  expect(mockPush).not.toHaveBeenCalled();
});

it('clears all project targets when returning to the project list', async () => {
  mockSearchParams = new URLSearchParams({
    tab: 'projects', projectId: mockProject.id, view: 'plan', subprojectId: 'section / one',
  });
  await openPage();
  fireEvent.click(screen.getByRole('button', { name: 'Back to projects' }));
  expect(Object.fromEntries(lastNavigation().searchParams)).toEqual({ tab: 'projects' });
});

it('reports inaccessible projects without fetching or granting additional access', async () => {
  mockSearchParams.set('projectId', 'private-project');
  mockListProjects.mockResolvedValue([]);
  render(<ProjectsPage canManage={false} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('no longer available or you do not have access');
  expect(mockDashboardProps.projects).toEqual([]);
  expect(mockPush).not.toHaveBeenCalled();
});

it('reports deleted sections', async () => {
  mockSearchParams.set('projectId', mockProject.id);
  mockSearchParams.set('subprojectId', 'deleted');
  await openPage();
  expect(screen.getByRole('alert')).toHaveTextContent('section is no longer available');
});
