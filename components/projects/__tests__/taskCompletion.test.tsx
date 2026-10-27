import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProjectItem, ProjectSubproject, ProjectTask } from '@myorg/types';
import ProjectsPage from '../ProjectsPage';
import ProjectEditor from '../ProjectEditor';
import { setCachedProjects } from '@/lib/client/projectsCache';
import { TaskModal } from '@myorg/ui';
import type { PlanLink } from '@/lib/projects/planning';

let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/',
}));
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
jest.mock('../../ConversationThread', () => ({
  __esModule: true,
  default: ({ threadId, taskId }: { threadId: string; taskId?: string }) => (
    <div data-testid="notification-conversation">{threadId} {taskId}</div>
  ),
}));
jest.mock('../ProjectsDashboard', () => ({
  __esModule: true,
  default: ({ projects, selectedProjectId, selectedTaskId, onApplyChange, onPlanMutation, onBulkTaskUpdate }: {
    projects: ProjectItem[];
    selectedProjectId?: string | null;
    selectedTaskId?: string | null;
    onApplyChange: (id: string, patch: Partial<ProjectItem>) => void;
    onPlanMutation: (id: string, action: 'add' | 'remove', link: PlanLink) => Promise<PlanLink[]>;
    onBulkTaskUpdate: (id: string, subprojects: ProjectSubproject[]) => Promise<ProjectItem>;
  }) => {
    const Editor = jest.requireActual('../ProjectEditor').default;
    return projects.map(project => <React.Fragment key={project.id}>
      <button type="button" onClick={() => void onPlanMutation(project.id, 'add', {
        prerequisite: { kind: 'task', id: 'first' }, dependent: { kind: 'task', id: 'second' },
      })}>Save dependency plan</button>
      <Editor
        key={project.id}
        project={project}
        targetTaskId={project.id === selectedProjectId ? selectedTaskId : null}
        onApplyChange={(patch: Partial<ProjectItem>) => onApplyChange(project.id, patch)}
        onBulkTaskUpdate={(subprojects: ProjectSubproject[]) => onBulkTaskUpdate(project.id, subprojects)}
      />
    </React.Fragment>);
  },
}));

const mockProjectsApi = {
  listProjects: jest.fn(),
  updateProject: jest.fn(),
  updateProjectPlan: jest.fn(),
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
    mockSearchParams = new URLSearchParams();
    localStorage.clear();
    mockProjectsApi.listProjects.mockResolvedValue([project()]);
    mockProjectsApi.updateProject.mockResolvedValue(project());
  });

  it('persists bulk dates through the API and shows server-confirmed tasks in the cache', async () => {
    mockProjectsApi.updateProject.mockImplementation(async (_id, patch) => ({ ...project(), ...patch }));
    render(<ProjectsPage canManage />);
    await screen.findByText('Task first');
    fireEvent.click(screen.getByRole('button', { name: 'More project actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit multiple tasks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select task: Task first' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select task: Task third' }));
    fireEvent.click(screen.getByRole('button', { name: 'Due date' }));
    fireEvent.change(screen.getByLabelText('Due date for selected tasks'), { target: { value: '2026-12-25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set date on 2 tasks' }));
    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(1));
    expect(mockProjectsApi.updateProject).toHaveBeenCalledWith('project', {
      subprojects: [
        expect.objectContaining({ tasks: [
          expect.objectContaining({ id: 'first', dueDate: '2026-12-25' }),
          expect.objectContaining({ id: 'second', dueDate: null }),
        ] }),
        expect.objectContaining({ tasks: [expect.objectContaining({ id: 'third', dueDate: '2026-12-25' })] }),
      ],
    });
    await waitFor(() => expect(screen.getByText('Updated 2 tasks.')).toBeInTheDocument());
    expect(setCachedProjects).toHaveBeenLastCalledWith([savedRequest(0)]);
  });

  it('retains the selection and previous cached tasks when a bulk API request fails', async () => {
    mockProjectsApi.updateProject.mockRejectedValueOnce(new Error('Bulk save unavailable'));
    render(<ProjectsPage canManage />);
    await screen.findByText('Task first');
    fireEvent.click(screen.getByRole('button', { name: 'More project actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit multiple tasks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select task: Task first' }));
    fireEvent.click(screen.getByRole('button', { name: 'Due date' }));
    fireEvent.change(screen.getByLabelText('Due date for selected tasks'), { target: { value: '2026-12-25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set date on 1 task' }));
    await waitFor(() => expect(screen.getAllByText('Bulk save unavailable').length).toBeGreaterThan(0));
    expect(screen.getByRole('button', { name: 'Select task: Task first' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.querySelector('[data-task-id="first"] .date-container')).not.toBeInTheDocument();
    expect(setCachedProjects).toHaveBeenLastCalledWith([project()]);
    expect(screen.queryByText('Updated 1 task.')).not.toBeInTheDocument();
  });

  it('orders Plan saves after pending task edits and before subsequent task edits', async () => {
    const taskSave = deferred<ProjectItem>();
    const planSave = deferred<ProjectItem>();
    const link: PlanLink = { prerequisite: { kind: 'task', id: 'first' }, dependent: { kind: 'task', id: 'second' } };
    mockProjectsApi.updateProject.mockReturnValueOnce(taskSave.promise);
    mockProjectsApi.updateProjectPlan.mockReturnValueOnce(planSave.promise);
    render(<ProjectsPage canManage />);
    await waitFor(() => expect(document.getElementById('task-first-done')).toBeInTheDocument());
    fireEvent.click(checkbox('first'));
    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Save dependency plan' }));
    expect(mockProjectsApi.updateProjectPlan).not.toHaveBeenCalled();
    const first = savedRequest(0);
    await act(async () => { taskSave.resolve(first); });
    await waitFor(() => expect(mockProjectsApi.updateProjectPlan).toHaveBeenCalledWith('project', 'add', link));
    fireEvent.click(checkbox('second'));
    expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(1);
    const planned = { ...first, planningLinks: [link] };
    mockProjectsApi.updateProject.mockImplementation(async (_id, patch) => ({ ...planned, ...patch }));
    await act(async () => { planSave.resolve(planned); });
    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(2));
    expect(setCachedProjects).toHaveBeenLastCalledWith([expect.objectContaining({ planningLinks: [link] })]);
  });

  it('opens the notification conversation after a delayed project load', async () => {
    mockSearchParams = new URLSearchParams('tab=projects&projectId=project&threadId=task%3Aproject%3Afirst');
    const pending = deferred<ProjectItem[]>();
    mockProjectsApi.listProjects.mockReturnValue(pending.promise);
    render(<ProjectsPage canManage />);
    expect(screen.queryByTestId('notification-conversation')).not.toBeInTheDocument();
    await act(async () => { pending.resolve([project()]); });
    expect(screen.getByTestId('notification-conversation')).toHaveTextContent('task:project:first first');
  });

  it('opens the exact task editor rather than a conversation for task notifications', async () => {
    mockSearchParams = new URLSearchParams('tab=projects&projectId=project&taskId=second');
    render(<ProjectsPage canManage />);
    expect(await screen.findByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
    const dueDateInput = await screen.findByLabelText(/Due date/);
    expect(dueDateInput.id).toMatch(/^task-date-second-/);
    expect(screen.getByLabelText('Task title')).toBeInTheDocument();
    const repeatSelect = screen.getByLabelText('Repeat');
    expect(repeatSelect).toBeInTheDocument();
    fireEvent.change(repeatSelect, { target: { value: 'weekly' } });
    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalled());
    const recurrenceSaved = mockProjectsApi.updateProject.mock.calls.some(([, patch]) =>
      (patch as Partial<ProjectItem>).subprojects?.some(sub =>
        sub.tasks.some(item => item.id === 'second' && item.recurrence === 'weekly'),
      ),
    );
    expect(recurrenceSaved).toBe(true);
    expect(screen.queryByTestId('notification-conversation')).not.toBeInTheDocument();
  });

  it('advances a recurring project task in place when completed', async () => {
    const recurringProject = project();
    recurringProject.subprojects[0]!.tasks[0] = {
      ...task('first'), dueDate: '2099-01-01', recurrence: 'weekly',
    };
    mockProjectsApi.listProjects.mockResolvedValue([recurringProject]);

    render(<ProjectsPage canManage />);
    await waitFor(() => expect(checkbox('first')).not.toBeChecked());
    fireEvent.click(checkbox('first'));

    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalled());
    const patch = mockProjectsApi.updateProject.mock.calls[0]?.[1] as Partial<ProjectItem>;
    const tasks = patch.subprojects?.flatMap(sub => sub.tasks) ?? [];
    expect(tasks).toHaveLength(3);
    expect(tasks.filter(item => item.id === 'first')).toHaveLength(1);
    expect(tasks.find(item => item.id === 'first')).toMatchObject({
      id: 'first', text: 'Task first', done: false, dueDate: '2099-01-08', recurrence: 'weekly',
      completedAt: null,
    });
  });

  it('advances a daily task on every check, including clicks in the enlarged target', () => {
    const recurringProject = project();
    recurringProject.subprojects[0]!.tasks[0] = {
      ...task('first'), dueDate: '2099-01-01', recurrence: 'daily',
      recurrenceAnchorDate: '2098-01-01',
    };
    const onApplyChange = jest.fn();
    render(<ProjectEditor project={recurringProject} onApplyChange={onApplyChange} />);
    const target = checkbox('first').closest('label')!;

    fireEvent.click(target);
    fireEvent.click(target);

    expect(onApplyChange).toHaveBeenCalledTimes(2);
    const latest: ProjectItem = onApplyChange.mock.calls[1][0];
    expect(latest.subprojects[0]!.tasks[0]).toMatchObject({
      id: 'first', done: false, dueDate: '2099-01-03', recurrence: 'daily',
    });

    expect(checkbox('first')).not.toBeChecked();
    expect(screen.queryByRole('dialog', { name: 'Edit task' })).not.toBeInTheDocument();
  });

  it('keeps the saved recurring due date in the reload cache and after remounting', async () => {
    let persisted = project();
    persisted.subprojects[0]!.tasks[0] = {
      ...task('first'), dueDate: '2099-01-01', recurrence: 'weekly',
    };
    mockProjectsApi.listProjects.mockImplementation(async () => JSON.parse(JSON.stringify([persisted])));
    mockProjectsApi.updateProject.mockImplementation(async (_id: string, patch: Partial<ProjectItem>) => {
      persisted = JSON.parse(JSON.stringify({ ...persisted, ...patch }));
      return persisted;
    });
    const view = render(<ProjectsPage canManage />);
    await waitFor(() => expect(checkbox('first')).not.toBeChecked());
    fireEvent.click(checkbox('first'));

    await waitFor(() => expect(setCachedProjects).toHaveBeenLastCalledWith([
      expect.objectContaining({
        subprojects: expect.arrayContaining([
          expect.objectContaining({
            tasks: expect.arrayContaining([
              expect.objectContaining({ id: 'first', done: false, dueDate: '2099-01-08' }),
            ]),
          }),
        ]),
      }),
    ]));
    view.unmount();
    mockProjectsApi.updateProject.mockClear();
    render(<ProjectsPage canManage />);
    await waitFor(() => expect(checkbox('first')).not.toBeChecked());
    fireEvent.click(checkbox('first'));
    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalled());
    expect(persisted.subprojects[0]!.tasks[0]).toMatchObject({
      id: 'first', done: false, dueDate: '2099-01-15', recurrence: 'weekly',
    });
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

  it('updates the open task editor due date on each recurring completion without reverting on close', () => {
    const recurringProject = project();
    recurringProject.subprojects[0]!.tasks[0] = {
      ...task('first'), dueDate: '2099-01-01', recurrence: 'weekly',
    };
    const onApplyChange = jest.fn();
    render(<ProjectEditor project={recurringProject} targetTaskId="first" onApplyChange={onApplyChange} />);
    expect(screen.getByLabelText(/Due date/)).toHaveValue('2099-01-01');
    fireEvent.click(checkbox('first'));
    expect(screen.getByLabelText(/Due date/)).toHaveValue('2099-01-08');
    fireEvent.click(checkbox('first'));
    expect(screen.getByLabelText(/Due date/)).toHaveValue('2099-01-15');
    fireEvent.keyDown(window, { key: 'Escape' });
    const latest: ProjectItem = onApplyChange.mock.calls.at(-1)![0];
    expect(latest.subprojects[0]!.tasks[0]).toMatchObject({
      dueDate: '2099-01-15', done: false, recurrence: 'weekly',
    });
  });

  it('removes an open task without its editor restoring the deleted task', () => {
    const onApplyChange = jest.fn();
    render(<ProjectEditor project={project()} targetTaskId="first" onApplyChange={onApplyChange} />);
    expect(screen.getByLabelText('Task title')).toBeInTheDocument();
    const deleteButton = document.querySelector<HTMLButtonElement>('[data-task-id="first"] button.delete')!;
    fireEvent.click(deleteButton);
    expect(document.querySelector('[data-task-id="first"]')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Task title')).not.toBeInTheDocument();
    const latest: ProjectItem = onApplyChange.mock.calls.at(-1)![0];
    expect(latest.subprojects.flatMap(sub => sub.tasks).map(task => task.id)).toEqual(['second', 'third']);
  });

  it('removes a deleted recurring task from the reload cache before its save completes', async () => {
    const initial = project();
    initial.subprojects[0]!.tasks[0] = {
      ...task('first'), dueDate: '2099-01-01', recurrence: 'weekly',
    };
    const pending = deferred<ProjectItem>();
    mockProjectsApi.listProjects.mockResolvedValue([initial]);
    mockProjectsApi.updateProject.mockReturnValueOnce(pending.promise);
    render(<ProjectsPage canManage />);
    await waitFor(() => expect(checkbox('first')).not.toBeChecked());
    fireEvent.click(document.querySelector<HTMLButtonElement>('[data-task-id="first"] button.delete')!);
    expect(document.querySelector('[data-task-id="first"]')).not.toBeInTheDocument();
    const cached = jest.mocked(setCachedProjects).mock.calls.at(-1)![0];
    expect(cached[0]!.subprojects.flatMap(sub => sub.tasks).map(task => task.id))
      .toEqual(['second', 'third']);
    await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(1));
    await act(async () => { pending.resolve(savedRequest(0)); });
    expect(jest.mocked(setCachedProjects).mock.calls.at(-1)![0][0]!.subprojects
      .flatMap(sub => sub.tasks).map(task => task.id)).toEqual(['second', 'third']);
  });

  it('saves title edits immediately without saving stale tasks during Strict Mode cleanup', () => {
    const onUpdateTask = jest.fn();
    const onSave = jest.fn();
    const onClose = jest.fn();
    const initial = { ...task('first'), dueDate: '2099-01-01', recurrence: 'weekly' as const };
    const view = render(
      <React.StrictMode>
        <TaskModal task={initial} onUpdateTask={onUpdateTask} onSave={onSave} onClose={onClose} />
      </React.StrictMode>,
    );
    expect(onUpdateTask).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Renamed task' } });
    expect(onUpdateTask).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Renamed task' }));
    const updated = { ...initial, text: 'Renamed task', dueDate: '2099-01-08' };
    view.rerender(
      <React.StrictMode>
        <TaskModal task={updated} onUpdateTask={onUpdateTask} onSave={onSave} onClose={onClose} />
      </React.StrictMode>,
    );
    expect(screen.getByLabelText('Task title')).toHaveValue('Renamed task');
    expect(screen.getByLabelText(/Due date/)).toHaveValue('2099-01-08');
    onUpdateTask.mockClear();
    view.unmount();
    expect(onUpdateTask).not.toHaveBeenCalled();
  });
});
