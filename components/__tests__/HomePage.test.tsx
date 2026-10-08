import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { ProjectItem, TaskItem } from '@myorg/types';
import HomePage from '../HomePage';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@myorg/api-client', () => ({
  createTasksApiClient: () => mockTasksApi,
  createProjectsApiClient: () => mockProjectsApi,
  createContactsApiClient: () => mockContactsApi,
}));
jest.mock('@myorg/utils', () => ({ preloadImages: jest.fn() }));
jest.mock('@/lib/client/tasksCache', () => ({
  getCachedTasksSync: () => null,
  setCachedTasks: jest.fn(),
  areTasksStale: () => true,
}));
jest.mock('@/lib/client/projectsCache', () => ({
  getCachedProjectsSync: () => null,
  setCachedProjects: jest.fn(),
  areProjectsStale: () => true,
}));
jest.mock('@/lib/client/contactsCache', () => ({
  getCachedContactsSync: () => null,
}));
jest.mock('../ContentHeader', () => ({ __esModule: true, default: () => null }));
jest.mock('../GlobalSearchResults', () => ({ __esModule: true, default: () => null }));
jest.mock('../EntityIcon', () => ({ __esModule: true, default: () => null }));

const mockTasksApi = { listTasks: jest.fn() };
const mockProjectsApi = { listProjects: jest.fn() };
const mockContactsApi = { listContacts: jest.fn() };

function task(dueDate: string | null, done = false): TaskItem {
  return { id: 'task', text: 'Test task', done, dueDate, favorite: false, description: '' };
}

function project(dueDate: string): ProjectItem {
  return {
    id: 'project',
    text: 'Test project',
    color: '#1976D2',
    subprojects: [{ id: 'subproject', text: 'Test subproject', tasks: [{ ...task(dueDate), people: [] }] }],
  };
}

async function loaded() {
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Coming Due' })).toBeInTheDocument());
}

function expectNoOverduePanel(container: HTMLElement) {
  expect(screen.queryByRole('heading', { name: 'Overdue' })).not.toBeInTheDocument();
  expect(screen.queryByText('No overdue tasks.')).not.toBeInTheDocument();
  expect(container.querySelector('.dashboardGrid')?.children).toHaveLength(2);
}

describe('home overdue panel', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-07T12:00:00'));
    jest.clearAllMocks();
    mockTasksApi.listTasks.mockResolvedValue([]);
    mockProjectsApi.listProjects.mockResolvedValue([]);
    mockContactsApi.listContacts.mockResolvedValue([]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ feedback: [] }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it.each([
    ['future', task('2026-10-14')],
    ['today', task('2026-10-07')],
    ['completed', task('2026-10-01', true)],
    ['undated', task(null)],
  ])('does not render a column for a %s task', async (_label, item) => {
    mockTasksApi.listTasks.mockResolvedValue([item]);
    const { container } = render(<HomePage />);
    await loaded();
    expectNoOverduePanel(container);
  });

  it('removes the column when the last global overdue task is updated to a future date', async () => {
    mockTasksApi.listTasks.mockResolvedValue([task('2026-10-01')]);
    const { container } = render(<HomePage />);
    await loaded();
    expect(screen.getByRole('heading', { name: 'Overdue' })).toBeInTheDocument();
    expect(container.querySelector('.dashboardGrid')?.children).toHaveLength(3);

    act(() => {
      window.dispatchEvent(new CustomEvent('fomo:taskUpdated', { detail: task('2026-10-14') }));
    });

    expectNoOverduePanel(container);
    expect(screen.getByText('Due: Oct 14')).toBeInTheDocument();
  });

  it('removes the column after refreshing the last project overdue task with a future date', async () => {
    mockProjectsApi.listProjects.mockResolvedValue([project('2026-10-01')]);
    const { container, rerender } = render(<HomePage isActive={false} />);
    await loaded();
    expect(screen.getByRole('heading', { name: 'Overdue' })).toBeInTheDocument();

    mockProjectsApi.listProjects.mockResolvedValue([project('2026-10-14')]);
    rerender(<HomePage isActive />);

    await waitFor(() => expectNoOverduePanel(container));
    expect(screen.getByText('Due: Oct 14')).toBeInTheDocument();
  });
});
