import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ProjectItem, ProjectTaskStatus } from '@myorg/types';
import { buildProjectStatus, compareTaskSnapshots, forecastProject, getTaskStatus, recordProjectStatus, validateTaskStatuses } from '@/lib/projects/status';
import { instantiateTemplate } from '@/lib/projects/instantiateTemplate';
import { validateProjectImportJson } from '@/lib/projects/importProject';
import { advanceRecurringTask } from '@/lib/tasks/recurrence';
import ProjectStatus from '../ProjectStatus';
import ProjectsDashboard from '../ProjectsDashboard';
import ThumbButton from '../../../packages/ui/src/ThumbButton';

function project(): ProjectItem {
  return {
    id: 'p', text: 'Release', color: '#123456',
    members: [{ userId: 'owner', name: 'Owner' }],
    subprojects: [{ id: 's', text: 'Launch', tasks: [
      { id: 'a', text: 'Prepare', done: false, dueDate: null, favorite: false, people: [] },
      { id: 'b', text: 'Build', done: false, dueDate: null, favorite: false, people: [] },
      { id: 'c', text: 'Ship', done: false, dueDate: null, favorite: false, people: [] },
      { id: 'd', text: 'Finished', done: true, dueDate: null, favorite: false, people: [] },
    ] }],
    planningLinks: [
      { prerequisite: { kind: 'task', id: 'a' }, dependent: { kind: 'task', id: 'b' } },
      { prerequisite: { kind: 'task', id: 'b' }, dependent: { kind: 'task', id: 'c' } },
      { prerequisite: { kind: 'task', id: 'a' }, dependent: { kind: 'task', id: 'd' } },
    ],
    milestones: [{ id: 'm', label: 'Delivery', taskIds: ['c'] }, { id: 'm2', label: 'Section ready', taskIds: [], sectionIds: ['s'] }],
    deadlines: [{ id: 'date', label: 'Launch day', date: '2026-12-01' }],
    dueDate: '2026-12-02',
  };
}

it('shows complete and ready work, ignores section hints, and requires all task prerequisites', () => {
  const p = project();
  p.planningLinks!.push({ prerequisite: { kind: 'section', id: 's' }, dependent: { kind: 'task', id: 'a' } });
  const report = buildProjectStatus(p);
  expect(report.tasks.filter(task => task.eligible).map(task => task.id)).toEqual(['a', 'd']);
  p.subprojects[0]!.tasks[0]!.done = true;
  p.planningLinks!.push({ prerequisite: { kind: 'task', id: 'missing' }, dependent: { kind: 'task', id: 'b' } });
  expect(buildProjectStatus(p).tasks.find(task => task.id === 'b')?.eligible).toBe(false);
});

it('reports transitive blocker impact without including completed dependents or inventing dates', () => {
  const p = project();
  p.subprojects[0]!.tasks[0]!.status = 'blocked';
  const report = buildProjectStatus(p);
  expect(report.status).toBe('blocked');
  expect(report.impact.blockedTasks.map(task => task.id)).toEqual(['a']);
  expect(report.impact.downstreamTasks.map(task => task.id)).toEqual(['b', 'c']);
  expect(report.impact.milestones.map(item => item.id)).toEqual(['m', 'm2']);
  expect(report.impact.deadlines.map(item => item.date)).toEqual(['2026-12-01', '2026-12-02']);
});

it.each([
  ['not_started', false, 'not_started'], ['on_track', false, 'in_progress'], ['in_progress', false, 'in_progress'],
  ['blocked', false, 'blocked'], ['complete', true, 'complete'], ['complete', false, 'not_started'],
] as [ProjectTaskStatus, boolean, ProjectTaskStatus][])('synchronizes %s / done=%s', (status, done, expected) => {
  expect(getTaskStatus({ done, status })).toBe(expected);
});

it('rolls up all tasks, including hidden tasks, and handles empty projects', () => {
  const p = project();
  p.subprojects[0]!.tasks.forEach(task => { task.done = false; });
  expect(buildProjectStatus(p).status).toBe('not_started');
  p.subprojects[0]!.tasks[0]!.status = 'on_track';
  expect(buildProjectStatus(p).status).toBe('in_progress');
  expect(buildProjectStatus(p).scheduleHealth).toBe('on_track');
  p.subprojects[0]!.tasks[0]!.status = 'in_progress';
  expect(buildProjectStatus(p).status).toBe('in_progress');
  p.subprojects[0]!.tasks[2]!.status = 'blocked';
  expect(buildProjectStatus(p).status).toBe('blocked');
  p.subprojects[0]!.tasks.forEach(task => { task.done = true; });
  expect(buildProjectStatus(p).status).toBe('complete');
  p.subprojects = [];
  expect(buildProjectStatus(p).status).toBe('not_started');
});

it('upserts UTC dates while freezing earlier task labels and impact data', () => {
  const p = project();
  p.statusHistory = recordProjectStatus(p, 'owner', new Date('2026-10-25T12:00:00Z'));
  p.subprojects[0]!.tasks[0]!.status = 'blocked';
  p.statusHistory = recordProjectStatus(p, 'member', new Date('2026-10-25T23:59:59Z'));
  expect(p.statusHistory).toHaveLength(1);
  expect(p.statusHistory[0]).toMatchObject({ updatedBy: 'member', status: 'blocked' });
  p.subprojects[0]!.text = 'Renamed section';
  p.subprojects[0]!.tasks[0]!.text = 'Renamed task';
  p.milestones![0]!.label = 'Renamed milestone';
  p.statusHistory = recordProjectStatus(p, 'owner', new Date('2026-10-26T00:00:00Z'));
  expect(p.statusHistory).toHaveLength(2);
  expect(p.statusHistory[0]!.tasks[0]).toMatchObject({ text: 'Prepare', section: 'Launch' });
  expect(p.statusHistory[0]!.impact.milestones[0]!.label).toBe('Delivery');
});

it('resets template and recurring statuses, preserves valid imports and rejects invalid ones', () => {
  const p = project();
  p.subprojects[0]!.tasks[0]!.status = 'blocked';
  p.subprojects[0]!.tasks[0]!.scheduleHealth = 'behind';
  p.subprojects[0]!.tasks[0]!.statusUpdates = [{ id: 'old', text: 'Status note' }];
  p.statusHistory = recordProjectStatus(p, 'owner');
  const copy = instantiateTemplate(p, 'New');
  expect(copy.subprojects![0]!.tasks[0]!.status).toBeUndefined();
  expect(copy.subprojects![0]!.tasks[0]!.scheduleHealth).toBeUndefined();
  expect(copy.subprojects![0]!.tasks[0]!.statusUpdates).toBeUndefined();
  expect(copy).not.toHaveProperty('statusHistory');
  const next = advanceRecurringTask({ ...p.subprojects[0]!.tasks[0]!, recurrence: 'daily' as const });
  expect(next?.status).toBe('not_started');
  expect(next?.scheduleHealth).toBeNull();
  expect(next?.statusUpdates).toEqual([]);
  const exported = { name: p.text, sub_projects: p.subprojects };
  expect(validateProjectImportJson(JSON.stringify(exported)).data?.subprojects[0]!.tasks[0]!.status).toBe('blocked');
  const imported = validateProjectImportJson(JSON.stringify(exported)).data?.subprojects[0]!.tasks[0]!;
  expect(imported.scheduleHealth).toBe('behind');
  expect(imported.statusUpdates![0]).toMatchObject({ text: 'Status note' });
  expect(imported.statusUpdates![0]!.id).not.toBe('old');
  expect(validateTaskStatuses([{ tasks: [{ status: 'invalid' }] }])).toBe('Invalid task status.');
  expect(validateProjectImportJson(JSON.stringify({ name: p.text, sub_projects: [{ text: 's', tasks: [{ text: 'a', status: 'invalid' }] }] })).ok).toBe(false);
});

it('renders eligible tasks with crisp SVG icons and four work states, saving a targeted update', async () => {
  const p = project();
  const onSave = jest.fn().mockResolvedValue(p);
  render(<ProjectStatus project={p} canManage onSave={onSave} />);
  const table = within(screen.getByRole('table', { name: 'Task status' }));
  expect(table.getByText('Launch')).toBeInTheDocument();
  expect(table.getByText('Prepare')).toBeInTheDocument();
  expect(table.getByRole('img', { name: 'Completed task' })).toBeInTheDocument();
  expect(table.queryByText('Build')).not.toBeInTheDocument();
  const select = table.getByRole('combobox', { name: 'Status for Prepare' });
  expect(within(select).getAllByRole('option').map(option => option.textContent)).toEqual(['Not Started', 'Blocked', 'In Progress', 'Complete']);
  expect(select.parentElement).toHaveClass('not_started');
  expect(select.parentElement!.querySelector('svg')).toHaveAttribute('viewBox', '0 0 24 24');
  expect(select.parentElement!.querySelector('.material-icons')).toBeNull();
  fireEvent.change(select, { target: { value: 'blocked' } });
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({ taskStatusUpdate: { taskId: 'a', status: 'blocked' } }));
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  expect(screen.queryByText('Changes saved.')).not.toBeInTheDocument();
  expect(screen.queryByText(/Completed tasks and tasks with no incomplete/)).not.toBeInTheDocument();
  expect(screen.queryByText(/tasks waiting on prerequisites are hidden/)).not.toBeInTheDocument();
  expect(screen.queryByText(/One snapshot per UTC date/)).not.toBeInTheDocument();
});

it('updates the status and impact immediately, disables only the pending task, and rolls back failures', async () => {
  let reject!: (reason: Error) => void;
  const onSave = jest.fn(() => new Promise<ProjectItem>((_resolve, fail) => { reject = fail; }));
  render(<ProjectStatus project={project()} canManage onSave={onSave} />);
  const select = screen.getByRole('combobox', { name: 'Status for Prepare' });
  fireEvent.change(select, { target: { value: 'blocked' } });
  expect(select).toHaveValue('blocked');
  expect(select.parentElement).toHaveClass('blocked');
  expect(screen.getByRole('region', { name: 'Overall project status' })).toHaveTextContent('Blocked');
  expect(screen.getByRole('region', { name: 'Overall project status' })).toHaveTextContent('2 dependent tasks affected');
  expect(select).toBeDisabled();
  expect(screen.getByRole('combobox', { name: 'Status for Finished' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: "Record today's update" })).not.toBeInTheDocument();
  await act(async () => reject(new Error('Storage unavailable')));
  expect(screen.getByRole('alert')).toHaveTextContent('Storage unavailable');
  expect(select).toBeEnabled();
  expect(select).toHaveValue('not_started');
  expect(screen.getByRole('region', { name: 'Overall project status' })).toHaveTextContent('On track');
});

it('keeps other optimistic task changes when one request fails and reconciles a successful response', async () => {
  const p = project();
  p.planningLinks = p.planningLinks!.filter(link => link.dependent.id !== 'd');
  let rejectFirst!: (reason: Error) => void;
  let resolveSecond!: (saved: ProjectItem) => void;
  const onSave = jest.fn()
    .mockImplementationOnce(() => new Promise<ProjectItem>((_resolve, reject) => { rejectFirst = reject; }))
    .mockImplementationOnce(() => new Promise<ProjectItem>(resolve => { resolveSecond = resolve; }));
  const page = render(<ProjectStatus project={p} canManage onSave={onSave} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Status for Prepare' }), { target: { value: 'blocked' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Status for Finished' }), { target: { value: 'in_progress' } });
  expect(onSave).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('combobox', { name: 'Status for Finished' })).toHaveValue('in_progress');
  await act(async () => rejectFirst(new Error('First save failed')));
  expect(screen.getByRole('combobox', { name: 'Status for Prepare' })).toHaveValue('not_started');
  expect(screen.getByRole('combobox', { name: 'Status for Finished' })).toHaveValue('in_progress');
  const saved: ProjectItem = {
    ...p, subprojects: p.subprojects.map(section => ({
      ...section, tasks: section.tasks.map(task => task.id === 'd' ? { ...task, done: false, status: 'in_progress' as const } : task),
    })),
  };
  await act(async () => {
    page.rerender(<ProjectStatus project={saved} canManage onSave={onSave} />);
    resolveSecond(saved);
  });
  expect(screen.getByRole('combobox', { name: 'Status for Finished' })).toHaveValue('in_progress');
  expect(screen.getByRole('combobox', { name: 'Status for Finished' })).toBeEnabled();
  expect(screen.getByRole('alert')).toHaveTextContent('First save failed');
});

it('immediately unlocks dependent tasks on completion and restores eligibility on failure', async () => {
  let reject!: (reason: Error) => void;
  const onSave = jest.fn(() => new Promise<ProjectItem>((_resolve, fail) => { reject = fail; }));
  render(<ProjectStatus project={project()} canManage onSave={onSave} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Status for Prepare' }), { target: { value: 'complete' } });
  expect(screen.getByRole('combobox', { name: 'Status for Build' })).toBeEnabled();
  await act(async () => reject(new Error('Completion save failed')));
  expect(screen.queryByRole('combobox', { name: 'Status for Build' })).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Completion save failed');
});

it('retains confirmed changes and history while another task is still saving', async () => {
  const p = project();
  p.planningLinks = [];
  let resolveFirst!: (saved: ProjectItem) => void;
  let resolveSecond!: (saved: ProjectItem) => void;
  const onSave = jest.fn()
    .mockImplementationOnce(() => new Promise<ProjectItem>(resolve => { resolveFirst = resolve; }))
    .mockImplementationOnce(() => new Promise<ProjectItem>(resolve => { resolveSecond = resolve; }));
  render(<ProjectStatus project={p} canManage onSave={onSave} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Status for Prepare' }), { target: { value: 'blocked' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Status for Build' }), { target: { value: 'in_progress' } });
  expect(screen.getByRole('table', { name: 'Status history' })).toHaveTextContent('No status updates recorded');
  const first: ProjectItem = {
    ...p, subprojects: p.subprojects.map(section => ({
      ...section, tasks: section.tasks.map(task => task.id === 'a' ? { ...task, status: 'blocked' as const } : task),
    })),
  };
  first.statusHistory = recordProjectStatus(first, 'owner', new Date('2026-10-25T12:00:00Z'));
  await act(async () => resolveFirst(first));
  expect(screen.getByRole('combobox', { name: 'Status for Prepare' })).toHaveValue('blocked');
  expect(screen.getByRole('combobox', { name: 'Status for Prepare' })).toBeEnabled();
  expect(screen.getByRole('combobox', { name: 'Status for Build' })).toHaveValue('in_progress');
  expect(screen.getByRole('combobox', { name: 'Status for Build' })).toBeDisabled();
  expect(screen.getByRole('table', { name: 'Status history' })).toHaveTextContent('2026-10-25');
  const second: ProjectItem = {
    ...first, subprojects: first.subprojects.map(section => ({
      ...section, tasks: section.tasks.map(task => task.id === 'b' ? { ...task, status: 'in_progress' as const } : task),
    })),
  };
  await act(async () => resolveSecond(second));
  expect(screen.getByRole('combobox', { name: 'Status for Prepare' })).toHaveValue('blocked');
  expect(screen.getByRole('combobox', { name: 'Status for Build' })).toHaveValue('in_progress');
  expect(screen.getByRole('combobox', { name: 'Status for Build' })).toBeEnabled();
});
it('automatically saves updates without a record button and supports read-only history', async () => {
  const p = project();
  p.statusHistory = recordProjectStatus(p, 'owner', new Date('2026-10-25T12:00:00Z'));
  p.subprojects[0]!.tasks[0]!.text = 'New task name';
  const onSave = jest.fn().mockResolvedValue(p);
  const page = render(<ProjectStatus project={p} canManage onSave={onSave} />);
  expect(screen.queryByRole('button', { name: "Record today's update" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '2026-10-25' }));
  expect(within(screen.getByRole('table', { name: 'Task status' })).getByText('Prepare')).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back to current status' }));
  expect(screen.getByRole('combobox', { name: 'Status for New task name' })).toBeInTheDocument();
  page.rerender(<ProjectStatus project={p} canManage={false} onSave={onSave} />);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: "Record today's update" })).not.toBeInTheDocument();
});

it('opens Status from workspace navigation and opens its thumb help', () => {
  jest.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
  render(<><ThumbButton activeTab="projects" /><ProjectsDashboard projects={[project()]} selectedProjectId="p" /></>);
  fireEvent.click(within(screen.getByRole('group', { name: 'Project workspace view' })).getByRole('button', { name: 'Status' }));
  expect(screen.getByRole('table', { name: 'Task status' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Status help' }));
  expect(screen.getByRole('dialog', { name: 'Project Status' })).toHaveTextContent('Compare dates');
  jest.restoreAllMocks();
});

it('inherits Behind transitively without changing work states and clears inheritance when a prerequisite recovers', () => {
  const p = project();
  p.subprojects[0]!.tasks[0]!.status = 'in_progress';
  p.subprojects[0]!.tasks[0]!.scheduleHealth = 'behind';
  let report = buildProjectStatus(p);
  expect(report.status).toBe('in_progress');
  expect(report.scheduleHealth).toBe('behind');
  expect(report.tasks.find(task => task.id === 'a')).toMatchObject({ scheduleHealth: 'behind', inheritedBehind: false });
  expect(report.tasks.find(task => task.id === 'b')).toMatchObject({ status: 'not_started', scheduleHealth: 'behind', inheritedBehind: true });
  expect(report.tasks.find(task => task.id === 'c')).toMatchObject({ scheduleHealth: 'behind', inheritedBehind: true });
  expect(report.tasks.find(task => task.id === 'd')).toMatchObject({ scheduleHealth: null, inheritedBehind: false });
  expect(report.impact.downstreamTasks.map(task => task.id)).toEqual(['b', 'c']);
  expect(report.impact.milestones.map(milestone => milestone.id)).toEqual(['m', 'm2']);
  p.subprojects[0]!.tasks[0]!.scheduleHealth = 'on_track';
  report = buildProjectStatus(p);
  expect(report.scheduleHealth).toBe('on_track');
  expect(report.tasks.find(task => task.id === 'b')).toMatchObject({ scheduleHealth: null, inheritedBehind: false });
  expect(report.impact.behindTasks).toHaveLength(0);
});

it('keeps inherited Behind while any prerequisite is behind, ignores section hints, and stops at completed tasks', () => {
  const p = project();
  p.subprojects[0]!.tasks.push({ id: 'e', text: 'Another prerequisite', status: 'blocked', scheduleHealth: 'behind', done: false, favorite: false, dueDate: null, people: [] });
  p.planningLinks!.push({ prerequisite: { kind: 'task', id: 'e' }, dependent: { kind: 'task', id: 'b' } });
  p.subprojects[0]!.tasks[0]!.status = 'in_progress';
  p.subprojects[0]!.tasks[0]!.scheduleHealth = 'on_track';
  expect(buildProjectStatus(p).tasks.find(task => task.id === 'c')?.scheduleHealth).toBe('behind');
  p.subprojects[0]!.tasks[1]!.done = true;
  expect(buildProjectStatus(p).tasks.find(task => task.id === 'c')?.scheduleHealth).toBeNull();
  p.planningLinks = [{ prerequisite: { kind: 'section', id: 's' }, dependent: { kind: 'task', id: 'a' } }];
  expect(buildProjectStatus(p).tasks.find(task => task.id === 'a')?.scheduleHealth).toBe('on_track');
});

it('migrates legacy On track to In Progress plus health, and exposes health only for active tasks', async () => {
  const p = project();
  p.subprojects[0]!.tasks[0]!.status = 'on_track';
  let resolve!: (saved: ProjectItem) => void;
  const onSave = jest.fn(() => new Promise<ProjectItem>(done => { resolve = done; }));
  render(<ProjectStatus project={p} canManage onSave={onSave} />);
  expect(screen.getByRole('combobox', { name: 'Status for Prepare' })).toHaveValue('in_progress');
  expect(screen.queryByRole('switch', { name: 'On track for Finished' })).not.toBeInTheDocument();
  const schedule = screen.getByRole('switch', { name: 'On track for Prepare' });
  expect(schedule).toBeChecked();
  expect(schedule).toHaveTextContent('BehindOn track');
  fireEvent.click(schedule);
  expect(schedule).not.toBeChecked();
  expect(schedule).toBeEnabled();
  expect(screen.getByRole('region', { name: 'Overall project status' })).toHaveTextContent('Behind');
  expect(onSave).toHaveBeenCalledWith({ taskScheduleUpdate: { taskId: 'a', health: 'behind' } });
  const saved = { ...p, subprojects: p.subprojects.map(section => ({
    ...section, tasks: section.tasks.map(task => task.id === 'a' ? { ...task, status: 'in_progress' as const, scheduleHealth: 'behind' as const } : task),
  })) };
  await act(async () => resolve(saved));
  expect(screen.getByRole('combobox', { name: 'Status for Prepare' })).toHaveValue('in_progress');
  expect(screen.getByRole('switch', { name: 'On track for Prepare' })).not.toBeChecked();
});

it('defaults active task switches to On track and supports left/right keyboard selection with rollback', async () => {
  const p = project();
  p.subprojects[0]!.tasks[0]!.status = 'in_progress';
  let reject!: (reason: Error) => void;
  const onSave = jest.fn(() => new Promise<ProjectItem>((_resolve, fail) => { reject = fail; }));
  render(<ProjectStatus project={p} canManage onSave={onSave} />);
  const control = screen.getByRole('switch', { name: 'On track for Prepare' });
  expect(control).toBeChecked();
  fireEvent.keyDown(control, { key: 'ArrowRight' });
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.keyDown(control, { key: 'ArrowLeft' });
  expect(control).not.toBeChecked();
  expect(onSave).toHaveBeenCalledWith({ taskScheduleUpdate: { taskId: 'a', health: 'behind' } });
  await act(async () => reject(new Error('Save failed')));
  expect(control).toBeChecked();
  expect(control).toBeEnabled();
  expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
});

it('uses mitigation-style plain bullets and row-selected inline addition/removal, with optimistic rollback', async () => {
  const p = project();
  p.subprojects[0]!.tasks[0]!.statusUpdates = [{ id: 'note', text: 'Waiting for delivery' }];
  let reject!: (reason: Error) => void;
  const onSave = jest.fn(() => new Promise<ProjectItem>((_resolve, fail) => { reject = fail; }));
  render(<ProjectStatus project={p} canManage onSave={onSave} />);
  expect(screen.getByText('Waiting for delivery')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Remove update: Waiting for delivery (Prepare)' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('row', { name: 'Task status: Prepare' }));
  const input = screen.getByRole('textbox', { name: 'New update for Prepare' });
  fireEvent.change(input, { target: { value: '  Supplier confirmed  ' } });
  fireEvent.submit(input.closest('form')!);
  expect(onSave).toHaveBeenLastCalledWith({ taskStatusNote: { taskId: 'a', action: 'add', update: { id: expect.any(String), text: 'Supplier confirmed' } } });
  expect(screen.getByRole('list', { name: 'Updates for Prepare' })).toHaveTextContent('Supplier confirmed');
  expect(input).toBeEnabled();
  expect(input).toHaveFocus();
  await act(async () => reject(new Error('Cannot save update')));
  expect(screen.getByRole('alert')).toHaveTextContent('Cannot save update');
  expect(screen.queryByText('Supplier confirmed')).not.toBeInTheDocument();
  expect(screen.getByText('Waiting for delivery')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove update: Waiting for delivery (Prepare)' }));
  expect(screen.queryByText('Waiting for delivery')).not.toBeInTheDocument();
  expect(onSave).toHaveBeenLastCalledWith({ taskStatusNote: { taskId: 'a', action: 'remove', updateId: 'note' } });
  await act(async () => reject(new Error('Cannot remove update')));
  expect(screen.getByText('Waiting for delivery')).toBeInTheDocument();
});

it('discards update drafts on blur and Escape and protects historical and read-only notes', () => {
  const p = project();
  p.subprojects[0]!.tasks[0]!.statusUpdates = [{ id: 'note', text: 'Original update' }];
  p.statusHistory = recordProjectStatus(p, 'owner', new Date('2026-10-25T12:00:00Z'));
  p.subprojects[0]!.tasks[0]!.statusUpdates![0]!.text = 'Current update';
  const onSave = jest.fn().mockResolvedValue(p);
  const page = render(<ProjectStatus project={p} canManage onSave={onSave} />);
  fireEvent.keyDown(screen.getByRole('row', { name: 'Task status: Prepare' }), { key: 'Enter' });
  let input = screen.getByRole('textbox', { name: 'New update for Prepare' });
  fireEvent.change(input, { target: { value: 'Discard' } });
  fireEvent.blur(input);
  expect(input).toHaveValue('');
  fireEvent.change(input, { target: { value: 'Discard on escape' } });
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('textbox', { name: 'New update for Prepare' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '2026-10-25' }));
  expect(within(screen.getByRole('table', { name: 'Task status' })).getByText('Original update')).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back to current status' }));
  page.rerender(<ProjectStatus project={p} canManage={false} onSave={onSave} />);
  fireEvent.click(screen.getByRole('row', { name: 'Task status: Prepare' }));
  expect(screen.getByText('Current update')).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});

it('keeps project status history without displaying task histories or changing recorded data', () => {
  const p = project();
  p.subprojects[0]!.tasks[1]!.statusUpdates = [{ id: 'old-note', text: 'Waiting for approval' }];
  const first = recordProjectStatus(p, 'owner', new Date('2026-10-25T12:00:00Z'))[0]!;
  p.statusHistory = [first];
  p.subprojects[0]!.tasks[0]!.status = 'in_progress';
  p.subprojects[0]!.tasks[0]!.scheduleHealth = 'behind';
  p.subprojects[0]!.tasks[1]!.statusUpdates = [{ id: 'new-note', text: 'Approval requested' }];
  p.statusHistory = recordProjectStatus(p, 'owner', new Date('2026-10-26T12:00:00Z'));
  const recordedHistory = JSON.stringify(p.statusHistory);
  render(<ProjectStatus project={p} canManage={false} />);
  expect(within(screen.getByRole('table', { name: 'Task status' })).queryByText('Build')).not.toBeInTheDocument();
  const history = screen.getByRole('table', { name: 'Status history' });
  expect(history).toHaveTextContent('2026-10-26');
  expect(history).toHaveTextContent('2026-10-25');
  expect(screen.queryByText(/Task history for/)).not.toBeInTheDocument();
  expect(screen.queryByRole('table', { name: /Task history/ })).not.toBeInTheDocument();
  expect(JSON.stringify(p.statusHistory)).toBe(recordedHistory);
});

it('compares task additions/removals, renames, section moves and edited notes by stable IDs', () => {
  const p = project();
  p.subprojects[0]!.tasks[0]!.statusUpdates = [{ id: 'note', text: 'Original note' }];
  const first = recordProjectStatus(p, 'owner', new Date('2026-10-25T12:00:00Z'))[0]!;
  p.subprojects[0]!.tasks[0]!.text = 'Renamed';
  p.subprojects[0]!.text = 'New section name';
  p.subprojects[0]!.tasks[0]!.statusUpdates![0]!.text = 'Edited note';
  p.subprojects[0]!.tasks.pop();
  p.subprojects[0]!.tasks.push({ id: 'new', text: 'New task', done: false, favorite: false, dueDate: null, people: [] });
  const next = recordProjectStatus(p, 'owner', new Date('2026-10-26T12:00:00Z'))[0]!;
  const rows = compareTaskSnapshots(next, first);
  const renamed = rows.find(row => row.task.id === 'a')!;
  expect(renamed.changes).toEqual(expect.arrayContaining(['Renamed from "Prepare"', 'Section: Launch -> New section name', '1 note edited']));
  expect(renamed.notes).toEqual([{ id: 'note', text: 'Edited note', change: 'Edited' }]);
  expect(rows.find(row => row.task.id === 'new')!.changes).toEqual(['Task added since previous snapshot']);
  expect(rows.find(row => row.task.id === 'd')).toMatchObject({ removed: true, task: { text: 'Finished', status: 'complete' } });
  expect(first.tasks[0]!.statusUpdates![0]!.text).toBe('Original note');
});

it('does not invent addition dates when comparing legacy snapshots lacking notes', () => {
  const p = project();
  const first = recordProjectStatus(p, 'owner', new Date('2026-10-25T12:00:00Z'))[0]!;
  delete first.tasks[0]!.statusUpdates;
  p.subprojects[0]!.tasks[0]!.statusUpdates = [{ id: 'note', text: 'Unknown addition date' }];
  const next = recordProjectStatus(p, 'owner', new Date('2026-10-26T12:00:00Z'))[0]!;
  const compared = compareTaskSnapshots(next, first)[0]!;
  expect(compared.notes![0]!.change).toBeNull();
  expect(compared.removedNotes).toEqual([]);
  expect(compareTaskSnapshots(first)[0]!.notes).toBeUndefined();
});

it('lets schedule switches toggle immediately while persisting repeated changes in order', async () => {
  const p = project();
  p.subprojects[0]!.tasks[0]!.status = 'in_progress';
  let resolveFirst!: (saved: ProjectItem) => void;
  let resolveSecond!: (saved: ProjectItem) => void;
  const onSave = jest.fn()
    .mockImplementationOnce(() => new Promise<ProjectItem>(resolve => { resolveFirst = resolve; }))
    .mockImplementationOnce(() => new Promise<ProjectItem>(resolve => { resolveSecond = resolve; }));
  render(<ProjectStatus project={p} canManage onSave={onSave} />);
  const control = screen.getByRole('switch', { name: 'On track for Prepare' });
  fireEvent.click(control);
  expect(control).not.toBeChecked();
  expect(control).toBeEnabled();
  fireEvent.click(control);
  expect(control).toBeChecked();
  expect(onSave).toHaveBeenCalledTimes(1);
  const first: ProjectItem = {
    ...p, subprojects: p.subprojects.map(section => ({ ...section, tasks: section.tasks.map(task =>
      task.id === 'a' ? { ...task, scheduleHealth: 'behind' as const } : task) })),
  };
  await act(async () => resolveFirst(first));
  expect(onSave).toHaveBeenCalledTimes(2);
  expect(onSave).toHaveBeenLastCalledWith({ taskScheduleUpdate: { taskId: 'a', health: 'on_track' } });
  expect(control).toBeChecked();
  await act(async () => resolveSecond(p));
  expect(control).toBeChecked();
});

it('keeps focus ready for consecutive bullets before saves finish and retains both after saving', async () => {
  const p = project();
  let resolveFirst!: (saved: ProjectItem) => void;
  let resolveSecond!: (saved: ProjectItem) => void;
  const onSave = jest.fn()
    .mockImplementationOnce(() => new Promise<ProjectItem>(resolve => { resolveFirst = resolve; }))
    .mockImplementationOnce(() => new Promise<ProjectItem>(resolve => { resolveSecond = resolve; }));
  render(<ProjectStatus project={p} canManage onSave={onSave} />);
  fireEvent.click(screen.getByRole('row', { name: 'Task status: Prepare' }));
  const input = screen.getByRole('textbox', { name: 'New update for Prepare' });
  for (const text of ['First point', 'Second point']) {
    fireEvent.change(input, { target: { value: text } });
    fireEvent.submit(input.closest('form')!);
    expect(input).toHaveFocus();
    expect(input).toHaveValue('');
    expect(input).toBeEnabled();
  }
  expect(within(screen.getByRole('list', { name: 'Updates for Prepare' })).getAllByRole('listitem')).toHaveLength(2);
  expect(onSave).toHaveBeenCalledTimes(1);
  const firstPatch = onSave.mock.calls[0]![0] as import('@myorg/types').ProjectUpdateInput;
  if (firstPatch.taskStatusNote?.action !== 'add') throw new Error('Expected note addition');
  const firstNote = firstPatch.taskStatusNote.update;
  const first = { ...p, subprojects: p.subprojects.map(section => ({
    ...section, tasks: section.tasks.map(task => task.id === 'a' ? { ...task, statusUpdates: [firstNote] } : task),
  })) };
  await act(async () => resolveFirst(first));
  expect(onSave).toHaveBeenCalledTimes(2);
  const secondPatch = onSave.mock.calls[1]![0] as import('@myorg/types').ProjectUpdateInput;
  if (secondPatch.taskStatusNote?.action !== 'add') throw new Error('Expected note addition');
  const secondNote = secondPatch.taskStatusNote.update;
  const second = { ...first, subprojects: first.subprojects.map(section => ({
    ...section, tasks: section.tasks.map(task => task.id === 'a' ? { ...task, statusUpdates: [...(task.statusUpdates ?? []), secondNote] } : task),
  })) };
  await act(async () => resolveSecond(second));
  const updates = within(screen.getByRole('list', { name: 'Updates for Prepare' }));
  expect(updates.getAllByRole('listitem')).toHaveLength(2);
  expect(updates.getByText('First point')).toBeInTheDocument();
  expect(updates.getByText('Second point')).toBeInTheDocument();
  expect(input).toHaveFocus();
});

it('keeps completion counts without duplicating the project header progress bar', () => {
  render(<ProjectStatus project={project()} canManage={false} />);
  const overview = within(screen.getByRole('region', { name: 'Overall project status' }));
  expect(overview.getByText('1 / 4 tasks complete')).toBeInTheDocument();
  expect(overview.queryByRole('progressbar')).not.toBeInTheDocument();
});

it('renders empty-project completion without an invalid progress value', () => {
  render(<ProjectStatus project={{ ...project(), subprojects: [] }} canManage={false} />);
  expect(screen.getByRole('heading', { name: 'No tasks yet' })).toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

it('forecasts effort as calendar days on the critical path and compares every deadline', () => {
  const p = project();
  p.subprojects[0]!.tasks.forEach(task => { task.effort = 2; });
  p.subprojects[0]!.tasks[0]!.status = 'in_progress';
  p.subprojects[0]!.tasks[0]!.scheduleHealth = 'behind';
  p.subprojects[0]!.tasks[0]!.delayDays = 3;
  p.deadlines = [{ id: 'd1', label: 'Launch', date: '2026-10-30' }, { id: 'd2', label: 'Later', date: '2026-11-10' }];
  p.dueDate = null;
  const forecast = forecastProject(p, new Date('2026-10-25T20:00:00Z'));
  expect(forecast.earliestFinish).toBe('2026-11-03');
  expect(forecast.delayDays).toBe(3);
  expect(buildProjectStatus(p, new Date('2026-10-25')).scheduleHealth).toBe('behind');
  expect(forecast.deadlines).toEqual([
    { label: 'Launch', date: '2026-10-30', daysLate: 4 },
    { label: 'Later', date: '2026-11-10', daysLate: 0 },
  ]);
  const snapshot = recordProjectStatus(p, 'owner', new Date('2026-10-25T20:00:00Z'))[0]!;
  expect(snapshot.forecast).toEqual(forecast);
  expect(snapshot.tasks[0]!.delayDays).toBe(3);
});

it('does not invent finish dates for missing effort or invalid dependencies and excludes recurring tasks', () => {
  const p = project();
  expect(forecastProject(p).earliestFinish).toBeNull();
  expect(forecastProject(p).missingEffort).toBe(3);
  p.subprojects[0]!.tasks.forEach(task => { task.effort = 1; });
  p.planningLinks!.push({ prerequisite: { kind: 'task', id: 'missing' }, dependent: { kind: 'task', id: 'a' } });
  expect(forecastProject(p).error).toContain('missing task prerequisites');
  expect(forecastProject(p).earliestFinish).toBeNull();
  p.planningLinks = [];
  p.subprojects[0]!.tasks[0]!.recurrence = 'daily';
  p.subprojects[0]!.tasks[0]!.effort = null;
  expect(forecastProject(p, new Date('2026-10-25T00:00:00Z')).earliestFinish).toBe('2026-10-26');
});

it('uses parallel critical paths rather than summing delays and ignores completed effort', () => {
  const p = project();
  p.planningLinks = [];
  const [a, b, c, d] = p.subprojects[0]!.tasks;
  Object.assign(a!, { effort: 2, status: 'in_progress', scheduleHealth: 'behind', delayDays: 3 });
  Object.assign(b!, { effort: 4, status: 'in_progress', scheduleHealth: 'behind', delayDays: 2 });
  c!.effort = 2;
  d!.effort = 100;
  expect(forecastProject(p, new Date('2026-10-25T23:59:00Z'))).toMatchObject({
    earliestFinish: '2026-10-31', delayDays: 2, missingEffort: 0,
  });
  a!.scheduleHealth = 'on_track';
  b!.scheduleHealth = 'on_track';
  expect(forecastProject(p, new Date('2026-10-25T23:59:00Z'))).toMatchObject({
    earliestFinish: '2026-10-29', delayDays: 0,
  });
});

it('rounds fractional paths to UTC finish dates and measures added delay between those dates', () => {
  const p = project();
  p.planningLinks = [];
  p.subprojects[0]!.tasks.forEach(task => { task.effort = 0; });
  Object.assign(p.subprojects[0]!.tasks[0]!, {
    effort: 0.4, status: 'in_progress', scheduleHealth: 'behind', delayDays: 0.3,
  });
  expect(forecastProject(p, new Date('2026-10-25T23:59:59Z'))).toMatchObject({
    earliestFinish: '2026-10-26', delayDays: 0,
  });
});

it('reports invalid cycles and deadline dates instead of a misleading finish', () => {
  const p = project();
  p.subprojects[0]!.tasks.forEach(task => { task.effort = 1; });
  p.planningLinks!.push({ prerequisite: { kind: 'task', id: 'c' }, dependent: { kind: 'task', id: 'a' } });
  expect(forecastProject(p).error).toBeTruthy();
  expect(forecastProject(p).earliestFinish).toBeNull();
  p.planningLinks = [];
  p.deadlines = [{ id: 'bad', label: 'Invalid', date: '2026-02-30' }];
  expect(forecastProject(p).error).toContain('invalid project deadline');
  expect(forecastProject(p).earliestFinish).toBeNull();
});

it('saves active-task delay days and includes their transitions in snapshot history', async () => {
  const p = project();
  Object.assign(p.subprojects[0]!.tasks[0]!, { status: 'in_progress', scheduleHealth: 'behind', delayDays: 1 });
  const before = recordProjectStatus(p, 'owner', new Date('2026-10-25'))[0]!;
  const onSave = jest.fn().mockResolvedValue(p);
  render(<ProjectStatus project={p} canManage onSave={onSave} />);
  const input = screen.getByRole('spinbutton', { name: 'Delay days for Prepare' });
  fireEvent.change(input, { target: { value: '4' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  fireEvent.blur(input);
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({ taskDelayUpdate: { taskId: 'a', days: 4 } }));
  p.subprojects[0]!.tasks[0]!.delayDays = 4;
  const after = recordProjectStatus(p, 'owner', new Date('2026-10-26'))[0]!;
  expect(compareTaskSnapshots(after, before)[0]!.changes).toContain('Delay: 1 -> 4 calendar days');
});
