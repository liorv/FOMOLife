import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProjectItem, ProjectTask } from '@myorg/types';
import ProjectsPage from '../ProjectsPage';
import ProjectEditor from '../ProjectEditor';

jest.mock('@myorg/api-client', () => ({
  createProjectsApiClient: () => mockProjectsApi,
  createContactsApiClient: () => mockContactsApi,
  createTasksApiClient: () => mockTasksApi,
}));
jest.mock('@/lib/client/contactsCache', () => ({
  getCachedContacts: async () => [],
  getContactsCacheAge: () => 0,
}));
jest.mock('@/lib/client/projectsCache', () => ({
  getCachedProjectsSync: () => null,
  setCachedProjects: jest.fn(),
  areProjectsStale: () => false,
  getProjectsCacheAge: () => 0,
  invalidateProjectsCache: jest.fn(),
}));
jest.mock('../../ConversationThread', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProjectsDashboard', () => ({
  __esModule: true,
  default: ({ projects, onApplyChange }: {
    projects: ProjectItem[];
    onApplyChange: (id: string, patch: Partial<ProjectItem>) => void;
  }) => {
    const Editor = jest.requireActual('../ProjectEditor').default;
    return projects.map(project => (
      <Editor
        key={project.id}
        project={project}
        onApplyChange={(patch: Partial<ProjectItem>) => onApplyChange(project.id, patch)}
      />
    ));
  },
}));

const mockProjectsApi = {
  listProjects: jest.fn(),
  updateProject: jest.fn(),
};
const mockContactsApi = { listContacts: jest.fn().mockResolvedValue([]) };
const mockTasksApi = { listTasks: jest.fn().mockResolvedValue([]) };

function task(id: string): ProjectTask {
  return { id, text: `Task ${id}`, done: false, dueDate: null, favorite: false, people: [] };
}

function project(): ProjectItem {
  return {
    id: 'project',
    text: 'Project',
    color: '#1976D2',
    avatarUrl: '/project.svg',
    subprojects: [
      { id: 'project-tasks', text: 'Project Tasks', isProjectLevel: true, collapsed: false, tasks: [task('first'), task('second')] },
      { id: 'subproject', text: 'Subproject', collapsed: false, tasks: [task('third')] },
    ],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function checkbox(id: string) {
  const input = document.getElementById(`task-${id}-done`);
  if (!input) throw new Error(`Missing checkbox for ${id}`);
  return input;
}

function savedRequest(index: number): ProjectItem {
  return { ...project(), ...mockProjectsApi.updateProject.mock.calls[index]?.[1] };
}

describe('rapid project task completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockProjectsApi.listProjects.mockResolvedValue([project()]);
  });

  it.each(['', 'Task'])('keeps every batched toggle in the editor with search %j', (searchQuery) => {
    const onApplyChange = jest.fn();
    render(<ProjectEditor project={project()} onApplyChange={onApplyChange} searchQuery={searchQuery} />);
    act(() => {
      fireEvent.click(checkbox('first'));
      fireEvent.click(checkbox('second'));
      fireEvent.click(checkbox('third'));
    });
    expect(onApplyChange).toHaveBeenCalledTimes(3);
    const latest: ProjectItem = onApplyChange.mock.calls[2][0];
    expect(latest.subprojects.flatMap(sub => sub.tasks).map(item => item.done)).toEqual([true, true, true]);
    for (const id of ['first', 'second', 'third']) expect(checkbox(id)).toBeChecked();
  });

  it('keeps prior completions when completed rows are hidden immediately', () => {
    const onApplyChange = jest.fn();
    render(<ProjectEditor project={project()} onApplyChange={onApplyChange} taskFilters={['hide_completed']} />);
    for (const id of ['first', 'second', 'third']) {
      fireEvent.click(checkbox(id));
      expect(document.getElementById(`task-${id}-done`)).not.toBeInTheDocument();
    }
    const latest: ProjectItem = onApplyChange.mock.calls[2][0];
    expect(latest.subprojects.flatMap(sub => sub.tasks).map(item => item.done)).toEqual([true, true, true]);
  });

  it('saves snapshots in order without undoing newer checks while a save is pending', async () => {
    const first = deferred<ProjectItem>();
    const second = deferred<ProjectItem>();
    const third = deferred<ProjectItem>();
    mockProjectsApi.updateProject
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise);
    const view = render(<ProjectsPage canManage />);
    await waitFor(() => expect(checkbox('first')).not.toBeChecked());

    fireEvent.click(checkbox('first'));
    fireEvent.click(checkbox('second'));
    fireEvent.click(checkbox('third'));
    for (const id of ['first', 'second', 'third']) expect(checkbox(id)).toBeChecked();
    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(1));

    await act(async () => { first.resolve(savedRequest(0)); });
    expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(2);
    for (const id of ['first', 'second', 'third']) expect(checkbox(id)).toBeChecked();

    await act(async () => { second.resolve(savedRequest(1)); });
    expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(3);
    for (const id of ['first', 'second', 'third']) expect(checkbox(id)).toBeChecked();

    const persisted = savedRequest(2);
    expect(persisted.subprojects.flatMap(sub => sub.tasks).map(item => item.done)).toEqual([true, true, true]);
    await act(async () => { third.resolve(persisted); });
    for (const id of ['first', 'second', 'third']) expect(checkbox(id)).toBeChecked();

    view.unmount();
    mockProjectsApi.listProjects.mockResolvedValue([persisted]);
    render(<ProjectsPage canManage />);
    await waitFor(() => expect(checkbox('third')).toBeChecked());
    for (const id of ['first', 'second']) expect(checkbox(id)).toBeChecked();
  });

  it('preserves a rapid complete then undo sequence for the same task', async () => {
    const first = deferred<ProjectItem>();
    const second = deferred<ProjectItem>();
    mockProjectsApi.updateProject.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<ProjectsPage canManage />);
    await waitFor(() => expect(checkbox('first')).not.toBeChecked());
    fireEvent.click(checkbox('first'));
    fireEvent.click(checkbox('first'));
    expect(checkbox('first')).not.toBeChecked();
    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(1));
    await act(async () => { first.resolve(savedRequest(0)); });
    expect(checkbox('first')).not.toBeChecked();
    expect(savedRequest(1).subprojects[0]?.tasks[0]?.done).toBe(false);
    await act(async () => { second.resolve(savedRequest(1)); });
    expect(checkbox('first')).not.toBeChecked();
  });

  it('shows save errors and continues saving subsequent checks', async () => {
    const first = deferred<ProjectItem>();
    const second = deferred<ProjectItem>();
    mockProjectsApi.updateProject.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<ProjectsPage canManage />);
    await waitFor(() => expect(checkbox('first')).not.toBeChecked());
    fireEvent.click(checkbox('first'));
    fireEvent.click(checkbox('second'));
    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(1));
    await act(async () => { first.reject(new Error('Unable to save project')); });
    expect(screen.getByText('Unable to save project')).toBeInTheDocument();
    expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(2);
    const persisted = savedRequest(1);
    expect(persisted.subprojects[0]?.tasks.map(item => item.done)).toEqual([true, true]);
    await act(async () => { second.resolve(persisted); });
    expect(checkbox('first')).toBeChecked();
    expect(checkbox('second')).toBeChecked();
  });

  it('does not toggle tasks in read-only mode', () => {
    const onApplyChange = jest.fn();
    render(<ProjectEditor project={project()} canManage={false} onApplyChange={onApplyChange} />);
    fireEvent.click(checkbox('first'));
    expect(onApplyChange).not.toHaveBeenCalled();
    expect(checkbox('first')).not.toBeChecked();
  });
});
