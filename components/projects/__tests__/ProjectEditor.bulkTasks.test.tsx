import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ProjectItem, ProjectSubproject, ProjectTask } from '@myorg/types';
import ProjectEditor from '../ProjectEditor';
import ProjectsDashboard from '../ProjectsDashboard';

afterEach(() => jest.restoreAllMocks());

function task(id: string, extra: Partial<ProjectTask> = {}): ProjectTask {
  return { id, text: `Task ${id}`, done: false, dueDate: null, favorite: false, people: [], ...extra };
}

function project(): ProjectItem {
  return {
    id: 'bulk-project', text: 'Bulk project', color: '#1976D2',
    members: [{ userId: 'alex', name: 'Alex' }, { userId: 'sam', name: 'Sam' }],
    subprojects: [
      { id: 'one', text: 'First section', collapsed: false, tasks: [
        task('a', { recurrence: 'monthly', recurrenceAnchorDate: '2026-01-31', people: [{ name: 'Sam' }] }),
        task('b', { people: [{ name: 'alex' }] }),
        task('done', { done: true }),
      ] },
      { id: 'two', text: 'Second section', collapsed: false, tasks: [task('c')] },
      { id: 'hidden', text: 'Collapsed section', collapsed: true, tasks: [task('hidden')] },
    ],
  };
}

function select(id: string) {
  fireEvent.click(screen.getByRole('button', { name: `Select task: Task ${id}` }));
}

function start() {
  fireEvent.click(screen.getByRole('button', { name: 'More project actions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit multiple tasks' }));
}

function openDate(date?: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Due date' }));
  if (date) fireEvent.change(screen.getByLabelText('Due date for selected tasks'), { target: { value: date } });
}

function savedTasks(save: jest.Mock): ProjectTask[] {
  return (save.mock.calls[0]![0] as ProjectSubproject[]).flatMap(section => section.tasks);
}

it('selects across sections without completing, editing, or dragging tasks', () => {
  const onApplyChange = jest.fn();
  render(<ProjectEditor project={project()} onApplyChange={onApplyChange} onBulkTaskUpdate={jest.fn()} />);
  start();
  select('a');
  fireEvent.click(screen.getByText('Task c'));
  expect(screen.getByText('2 selected')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(onApplyChange).not.toHaveBeenCalled();
  expect(document.querySelector('[data-task-id="a"]')).toHaveAttribute('draggable', 'false');
  expect(document.querySelector('[data-task-id="a"]')).toHaveClass('task--selected');
  expect(screen.queryByRole('checkbox', { name: /Mark as complete/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Select task: Task a' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Select task: Task a' }), { key: ' ' });
  expect(screen.getByRole('button', { name: 'Select task: Task a' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Select task: Task a' }), { key: 'Enter' });
  expect(screen.getByRole('button', { name: 'Select task: Task a' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('checkbox', { name: 'Mark as complete: Task a' })).not.toBeChecked();
});

it('sets dates in one save, updates recurrence anchors, and preserves unrelated fields and tasks', async () => {
  const original = project();
  const save = jest.fn(async (subprojects: ProjectSubproject[]) => ({ ...original, subprojects }));
  render(<ProjectEditor project={original} onBulkTaskUpdate={save} />);
  start();
  select('a');
  select('c');
  openDate('2026-12-25');
  expect(save).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Set date on 2 tasks' })));
  expect(save).toHaveBeenCalledTimes(1);
  expect(savedTasks(save).find(item => item.id === 'a')).toMatchObject({
    dueDate: '2026-12-25', recurrenceAnchorDate: '2026-12-25', recurrence: 'monthly',
    people: [{ name: 'Sam' }], done: false,
  });
  expect(savedTasks(save).find(item => item.id === 'c')).toMatchObject({ dueDate: '2026-12-25' });
  expect(savedTasks(save).find(item => item.id === 'b')).toEqual(original.subprojects[0]!.tasks[1]);
  expect(screen.getByRole('status')).toHaveTextContent('Updated 2 tasks.');
  expect(screen.queryByRole('region', { name: 'Bulk task actions' })).not.toBeInTheDocument();
});

it('clears dates and recurring anchors without changing completion', async () => {
  const original = project();
  const save = jest.fn(async (subprojects: ProjectSubproject[]) => ({ ...original, subprojects }));
  render(<ProjectEditor project={original} onBulkTaskUpdate={save} />);
  start();
  select('a');
  select('done');
  openDate();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Clear due date on 2 tasks' })));
  expect(savedTasks(save).find(item => item.id === 'a')).toMatchObject({ dueDate: null, recurrenceAnchorDate: null });
  expect(savedTasks(save).find(item => item.id === 'done')?.done).toBe(true);
});

it('adds an assignee while preserving other people and deduplicating case-insensitively', async () => {
  const original = project();
  const save = jest.fn(async (subprojects: ProjectSubproject[]) => ({ ...original, subprojects }));
  render(<ProjectEditor project={original} onBulkTaskUpdate={save} />);
  start();
  select('a');
  select('b');
  fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Assign a project member' })).getByRole('button', { name: 'Alex' }));
  expect(save).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Add Alex to 2 tasks' })));
  expect(savedTasks(save).find(item => item.id === 'a')?.people).toEqual([{ name: 'Sam' }, { name: 'Alex' }]);
  expect(savedTasks(save).find(item => item.id === 'b')?.people).toEqual([{ name: 'alex' }]);
});

it('selects only visible tasks globally or within a section', () => {
  render(<ProjectEditor project={project()} taskFilters={['hide_completed']} onBulkTaskUpdate={jest.fn()} />);
  start();
  fireEvent.click(screen.getByRole('button', { name: 'Select visible tasks in First section' }));
  expect(screen.getByText('2 selected')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Select all visible' }));
  expect(screen.getByText('3 selected')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Select task: Task hidden' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
  expect(screen.getByText('0 selected')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Due date' })).toBeDisabled();
});

it('limits selection to search results in the flat view', () => {
  render(<ProjectEditor project={project()} searchQuery="Task c" onBulkTaskUpdate={jest.fn()} />);
  start();
  fireEvent.click(screen.getByRole('button', { name: 'Select all visible' }));
  expect(screen.getByText('1 selected')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Select task: Task c' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('button', { name: 'Select task: Task a' })).not.toBeInTheDocument();
});

it('does not optimistically change tasks and retains selection after a failed save for retry', async () => {
  const original = project();
  let reject!: (error: Error) => void;
  const save = jest.fn().mockImplementationOnce(() => new Promise((_resolve, rejectSave) => { reject = rejectSave; }))
    .mockImplementation(async (subprojects: ProjectSubproject[]) => ({ ...original, subprojects }));
  render(<ProjectEditor project={original} onBulkTaskUpdate={save} />);
  start();
  select('a');
  openDate('2026-12-25');
  fireEvent.click(screen.getByRole('button', { name: 'Set date on 1 task' }));
  expect(screen.getByRole('button', { name: 'Set date on 1 task' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByText('1 selected')).toBeInTheDocument();
  expect(document.querySelector('[data-task-id="a"] .date-container')).not.toBeInTheDocument();
  await act(async () => reject(new Error('Network unavailable')));
  expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable');
  expect(screen.getByRole('button', { name: 'Select task: Task a' })).toHaveAttribute('aria-pressed', 'true');
  expect(document.querySelector('[data-task-id="a"] .date-container')).not.toBeInTheDocument();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Set date on 1 task' })));
  expect(save).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('status')).toHaveTextContent('Updated 1 task.');
});

it('clears selection on changes to filters, search, workspace, or project', () => {
  const original = project();
  const save = jest.fn();
  const { rerender } = render(<ProjectEditor project={original} onBulkTaskUpdate={save} />);
  start();
  select('a');
  rerender(<ProjectEditor project={original} onBulkTaskUpdate={save} taskFilters={['hide_completed']} />);
  expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  start();
  select('b');
  rerender(<ProjectEditor project={original} onBulkTaskUpdate={save} searchQuery="Task b" />);
  expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  start();
  select('b');
  rerender(<ProjectEditor project={original} onBulkTaskUpdate={save} workspaceView="plan" />);
  expect(screen.queryByRole('region', { name: 'Bulk task actions' })).not.toBeInTheDocument();
  rerender(<ProjectEditor project={{ ...original, id: 'another' }} onBulkTaskUpdate={save} />);
  start();
  expect(screen.getByText('0 selected')).toBeInTheDocument();
});

it('does not offer bulk editing to read-only users or without a persistence handler', () => {
  const { rerender } = render(<ProjectEditor project={project()} canManage={false} onBulkTaskUpdate={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'More project actions' }));
  expect(screen.queryByRole('button', { name: 'Edit multiple tasks' })).not.toBeInTheDocument();
  rerender(<ProjectEditor project={project()} />);
  expect(screen.queryByRole('button', { name: 'Edit multiple tasks' })).not.toBeInTheDocument();
});

it('passes bulk edits through the dashboard for the selected project', async () => {
  jest.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
  const original = project();
  const save = jest.fn(async (_id: string, subprojects: ProjectSubproject[]) => ({ ...original, subprojects }));
  render(<ProjectsDashboard projects={[original]} selectedProjectId={original.id} onBulkTaskUpdate={save} />);
  expect(within(screen.getByRole('group', { name: 'Project tools' })).queryByRole('button', { name: /Select tasks|Edit multiple tasks/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit multiple tasks' })).not.toBeInTheDocument();
  start();
  select('a');
  select('c');
  openDate('2026-12-25');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Set date on 2 tasks' })));
  expect(save).toHaveBeenCalledWith(original.id, expect.arrayContaining([
    expect.objectContaining({ id: 'one', tasks: expect.arrayContaining([
      expect.objectContaining({ id: 'a', dueDate: '2026-12-25' }),
    ]) }),
    expect.objectContaining({ id: 'two', tasks: [
      expect.objectContaining({ id: 'c', dueDate: '2026-12-25' }),
    ] }),
  ]));
});

it('explains selection mode and leaves without saving when Done is clicked', () => {
  const save = jest.fn();
  render(<ProjectEditor project={project()} onBulkTaskUpdate={save} />);
  start();
  expect(screen.getByText('Select tasks to edit')).toBeInTheDocument();
  select('a');
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.queryByRole('region', { name: 'Bulk task actions' })).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Mark as complete: Task a' })).not.toBeChecked();
  expect(screen.getByRole('button', { name: 'More project actions' })).toHaveFocus();
  expect(save).not.toHaveBeenCalled();
});

it('separates selection controls from actions on selected tasks', () => {
  render(<ProjectEditor project={project()} onBulkTaskUpdate={jest.fn()} />);
  start();
  const selection = within(screen.getByRole('group', { name: 'Select tasks to edit' }));
  const actions = within(screen.getByRole('group', { name: 'Change selected tasks' }));
  expect(selection.getByRole('button', { name: 'Select all visible' })).toBeInTheDocument();
  expect(selection.getByRole('button', { name: 'Clear selection' })).toBeDisabled();
  expect(selection.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  expect(selection.queryByRole('button', { name: 'Due date' })).not.toBeInTheDocument();
  expect(actions.queryByRole('button', { name: 'Select all visible' })).not.toBeInTheDocument();
  expect(actions.getByRole('button', { name: 'Due date' })).toBeDisabled();
  expect(actions.getByRole('button', { name: 'Assign' })).toBeDisabled();
  select('a');
  fireEvent.click(actions.getByRole('button', { name: 'Due date' }));
  const dateAction = actions.getByRole('button', { name: 'Due date' });
  expect(dateAction).toHaveAttribute('aria-expanded', 'true');
  expect(document.getElementById(dateAction.getAttribute('aria-controls')!))
    .toContainElement(actions.getByLabelText('Due date for selected tasks'));
  expect(selection.queryByLabelText('Due date for selected tasks')).not.toBeInTheDocument();
  expect(actions.getByRole('button', { name: 'Set date on 1 task' })).toBeDisabled();
});
