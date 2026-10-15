import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ProjectItem, TaskItem } from '@myorg/types';
import HomePage from '../HomePage';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
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

const mockTasksApi = { listTasks: jest.fn(), updateTask: jest.fn() };
const mockProjectsApi = { listProjects: jest.fn(), updateProject: jest.fn() };
const mockContactsApi = { listContacts: jest.fn() };
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

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

/** Simulates a touch drag across a row, moving `dx` horizontally and `dy` vertically. */
function swipe(row: HTMLElement, dx: number, dy = 0) {
  const start = { clientX: 150, clientY: 100 };
  fireEvent.touchStart(row, { touches: [start] });
  fireEvent.touchMove(row, { touches: [{ clientX: start.clientX + dx / 2, clientY: start.clientY + dy / 2 }] });
  fireEvent.touchMove(row, { touches: [{ clientX: start.clientX + dx, clientY: start.clientY + dy }] });
  fireEvent.touchEnd(row, { changedTouches: [{ clientX: start.clientX + dx, clientY: start.clientY + dy }] });
}

describe('home overdue panel', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-07T12:00:00'));
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockTasksApi.listTasks.mockResolvedValue([]);
    mockTasksApi.updateTask.mockResolvedValue(task('2026-10-14'));
    mockProjectsApi.listProjects.mockResolvedValue([]);
    mockContactsApi.listContacts.mockResolvedValue([]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ feedback: [] }),
    });
  });

  it('opens a standalone task from a notification after tasks finish loading', async () => {
    mockSearchParams = new URLSearchParams('tab=tasks&taskId=task');
    mockTasksApi.listTasks.mockResolvedValue([task('2026-10-14')]);
    render(<HomePage />);
    await loaded();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Due date/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Test task', level: 2 })).toBeInTheDocument();
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

describe('home task row actions', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-07T12:00:00'));
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockTasksApi.listTasks.mockResolvedValue([]);
    mockProjectsApi.listProjects.mockResolvedValue([]);
    mockProjectsApi.updateProject.mockImplementation(async (_id: string, patch: Partial<ProjectItem>) => ({
      ...project('2026-10-01'),
      ...patch,
    }));
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

  it('edits inline when the row is clicked (default action)', async () => {
    mockTasksApi.listTasks.mockResolvedValue([task('2026-10-01')]);
    render(<HomePage />);
    await loaded();

    const row = screen.getByRole('button', { name: /error_outline Test task/ });
    fireEvent.click(row);

    expect(screen.getByLabelText(/Due date/)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(row);
    expect(screen.queryByLabelText(/Due date/)).not.toBeInTheDocument();
  });

  it('navigates from the Open action', async () => {
    mockTasksApi.listTasks.mockResolvedValue([task('2026-10-01')]);
    render(<HomePage />);
    await loaded();

    fireEvent.click(screen.getByRole('button', { name: 'Open "Test task"' }));

    expect(mockPush).toHaveBeenCalledWith('/?tab=tasks&taskId=task');
  });

  it('opens the exact project task without a search query', async () => {
    mockProjectsApi.listProjects.mockResolvedValue([project('2026-10-01')]);
    render(<HomePage />);
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Open "Test task"' }));
    expect(mockPush).toHaveBeenCalledWith('/?tab=projects&taskId=task&projectId=project');
  });

  it.each(['favorites', 'overdue', 'coming due'])('edits a task inline in %s', async panel => {
    const item = { ...task(panel === 'overdue' ? '2026-10-01' : '2026-10-14'), favorite: panel === 'favorites' };
    mockTasksApi.listTasks.mockResolvedValue([item]);
    const { container } = render(<HomePage />);
    await loaded();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit "Test task"' })[0]!);
    const editor = screen.getByLabelText(/Due date/);
    expect(editor.closest('li')).toContainElement(container.querySelector('.swipeItem'));
    expect(editor.closest('.swipeItem')).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.change(editor, { target: { value: '2026-10-15' } });
    await waitFor(() => expect(mockTasksApi.updateTask).toHaveBeenCalledWith('task', expect.objectContaining({ dueDate: '2026-10-15' })));
  });

  it('persists inline edits to the project rather than the global task API', async () => {
    mockProjectsApi.listProjects.mockResolvedValue([project('2026-10-01')]);
    render(<HomePage />);
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Edit "Test task"' }));
    fireEvent.change(screen.getByLabelText(/Due date/), { target: { value: '2026-10-02' } });
    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledWith('project', {
      subprojects: [expect.objectContaining({
        tasks: [expect.objectContaining({ id: 'task', dueDate: '2026-10-02' })],
      })],
    }));
    expect(mockTasksApi.updateTask).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each(['Favorites', 'Overdue', 'Coming Due'])('assigns the project members from %s, even when they are not contacts', async panel => {
    const item = project(panel === 'Overdue' ? '2026-10-01' : '2026-10-14');
    item.subprojects[0]!.tasks[0]!.favorite = panel === 'Favorites';
    item.members = [
      { userId: 'self', name: 'Current user' },
      { userId: 'teammate', name: 'Project teammate', avatarUrl: '/teammate.png' },
    ];
    mockProjectsApi.listProjects.mockResolvedValue([item]);
    mockContactsApi.listContacts.mockResolvedValue([
      { id: 'unrelated', name: 'Unrelated contact', status: 'linked' },
    ]);
    mockProjectsApi.updateProject.mockImplementation(async (_id: string, patch: Partial<ProjectItem>) => ({
      ...item,
      ...patch,
    }));
    render(<HomePage />);
    await loaded();
    const card = screen.getByRole('heading', { name: panel }).parentElement!.parentElement!;
    fireEvent.click(within(card).getByRole('button', { name: 'Edit "Test task"' }));

    expect(within(card).getByTitle('Current user')).toBeInTheDocument();
    const teammate = within(card).getByTitle('Project teammate');
    expect(within(teammate).getByAltText('Project teammate')).toHaveAttribute('src', '/teammate.png');
    expect(within(card).queryByTitle('Unrelated contact')).not.toBeInTheDocument();
    expect(within(card).queryByText('Invite members to assign owners.')).not.toBeInTheDocument();

    fireEvent.click(teammate);
    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenLastCalledWith('project', {
      subprojects: [expect.objectContaining({
        tasks: [expect.objectContaining({ people: [{ name: 'Project teammate' }] })],
      })],
    }));
    expect(within(card).getByTitle('Project teammate')).toHaveClass('member-avatar-btn--active');

    fireEvent.click(within(card).getByTitle('Project teammate'));
    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenLastCalledWith('project', {
      subprojects: [expect.objectContaining({
        tasks: [expect.objectContaining({ people: [] })],
      })],
    }));
    expect(mockTasksApi.updateTask).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('continues to show contacts for a standalone task', async () => {
    mockTasksApi.listTasks.mockResolvedValue([task('2026-10-01')]);
    mockContactsApi.listContacts.mockResolvedValue([
      { id: 'contact', name: 'Standalone contact', status: 'linked' },
    ]);
    render(<HomePage />);
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Edit "Test task"' }));
    expect(screen.getByTitle('Standalone contact')).toBeInTheDocument();
  });

  it('keeps field labels unique when the same task is edited in two panels', async () => {
    mockTasksApi.listTasks.mockResolvedValue([{ ...task('2026-10-01'), favorite: true }]);
    render(<HomePage />);
    await loaded();
    for (const button of screen.getAllByRole('button', { name: 'Edit "Test task"' })) {
      fireEvent.click(button);
    }
    const fields = screen.getAllByLabelText(/Due date/);
    expect(fields).toHaveLength(2);
    expect(new Set(fields.map(field => field.id)).size).toBe(2);
  });

  it('marks a global task as done from the overdue panel', async () => {
    mockTasksApi.listTasks.mockResolvedValue([task('2026-10-01')]);
    mockTasksApi.updateTask.mockResolvedValue({ ...task('2026-10-01', true) });
    const { container } = render(<HomePage />);
    await loaded();
    expect(screen.getByRole('heading', { name: 'Overdue' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark "Test task" as done' }));

    expect(mockTasksApi.updateTask).toHaveBeenCalledWith('task', { done: true });
    await waitFor(() => expectNoOverduePanel(container));
  });

  it('marks a project task as done from the overdue panel', async () => {
    mockProjectsApi.listProjects.mockResolvedValue([project('2026-10-01')]);
    const { container } = render(<HomePage />);
    await loaded();
    expect(screen.getByRole('heading', { name: 'Overdue' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark "Test task" as done' }));

    expect(mockProjectsApi.updateProject).toHaveBeenCalledWith('project', {
      subprojects: [expect.objectContaining({
        id: 'subproject',
        tasks: [expect.objectContaining({ id: 'task', done: true })],
      })],
    });
    await waitFor(() => expectNoOverduePanel(container));
  });

  it('opens the action tray when the row is swiped left', async () => {
    mockTasksApi.listTasks.mockResolvedValue([task('2026-10-01')]);
    const { container } = render(<HomePage />);
    await loaded();

    const row = container.querySelector('.swipeItem') as HTMLElement;
    expect(row).not.toHaveClass('swipeItemOpen');

    swipe(row, -120);

    expect(row).toHaveClass('swipeItemOpen');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('marks the task as done when the row is swiped right past the threshold', async () => {
    mockTasksApi.listTasks.mockResolvedValue([task('2026-10-01')]);
    mockTasksApi.updateTask.mockResolvedValue({ ...task('2026-10-01', true) });
    const { container } = render(<HomePage />);
    await loaded();

    swipe(container.querySelector('.swipeItem') as HTMLElement, 110);

    expect(mockTasksApi.updateTask).toHaveBeenCalledWith('task', { done: true });
    await waitFor(() => expectNoOverduePanel(container));
  });

  it('ignores a short swipe that does not reach either threshold', async () => {
    mockTasksApi.listTasks.mockResolvedValue([task('2026-10-01')]);
    const { container } = render(<HomePage />);
    await loaded();

    const row = container.querySelector('.swipeItem') as HTMLElement;
    swipe(row, 30);

    expect(row).not.toHaveClass('swipeItemOpen');
    expect(mockTasksApi.updateTask).not.toHaveBeenCalled();
  });

  it('does not swipe when the gesture is mostly vertical (scrolling)', async () => {
    mockTasksApi.listTasks.mockResolvedValue([task('2026-10-01')]);
    const { container } = render(<HomePage />);
    await loaded();

    const row = container.querySelector('.swipeItem') as HTMLElement;
    swipe(row, -120, 200);

    expect(row).not.toHaveClass('swipeItemOpen');
  });
});
