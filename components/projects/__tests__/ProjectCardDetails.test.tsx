import { render, screen, within } from '@testing-library/react';
import type { ProjectItem, ProjectTask } from '@myorg/types';
import ProjectCardDetails from '../ProjectCardDetails';

const now = new Date(2026, 9, 27, 16);
const task = (id: string, dueDate: string | null = null, extra: Partial<ProjectTask> = {}): ProjectTask => ({
  id, text: id, done: false, dueDate, favorite: false, people: [], ...extra,
});
const project = (tasks: ProjectTask[], extra: Partial<ProjectItem> = {}): ProjectItem => ({
  id: 'p', text: 'Launch', color: '#1976d2',
  subprojects: [{ id: 's', text: 'Work', tasks }],
  ...extra,
});

it('shows task-derived progress, non-overlapping date counts, and two earliest unfinished tasks', () => {
  render(<ProjectCardDetails now={now} project={project([
    task('Undated'),
    task('Tomorrow task', '2026-10-28'),
    task('Due today', '2026-10-27'),
    task('Overdue task', '2026-10-26'),
    task('Old completed task', '2026-10-20', { done: true }),
    task('Seventh day', '2026-11-03'),
    task('Outside window', '2026-11-04'),
  ], { progress: 99, goal: 'Ship the new site' })} />);
  expect(screen.getByText('Ship the new site')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '14');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '1 of 7 tasks done');
  expect(screen.getByText('1 overdue')).toBeInTheDocument();
  expect(screen.getByText('Overdue')).toBeInTheDocument();
  expect(screen.getByText('3 due in 7 days')).toBeInTheDocument();
  const rows = within(screen.getByRole('list')).getAllByRole('listitem');
  expect(rows).toHaveLength(2);
  expect(within(rows[0]!).getByText('\u2022')).toHaveAttribute('aria-hidden', 'true');
  expect(rows[0]).toHaveTextContent('Overdue task');
  expect(rows[1]).toHaveTextContent('Due todayToday');
  expect(screen.queryByText('Old completed task')).not.toBeInTheDocument();
});

it('uses local calendar dates rather than UTC instants for today and tomorrow labels', () => {
  render(<ProjectCardDetails now={now} project={project([
    task('Today task', '2026-10-27T00:00:00.000Z'),
    task('Tomorrow task', '2026-10-28'),
  ])} />);
  expect(screen.getByText('Today')).toBeInTheDocument();
  expect(screen.getByText('Tomorrow')).toBeInTheDocument();
  expect(screen.queryByText(/overdue/)).not.toBeInTheDocument();
});

it('reuses management health and excludes blocked and prerequisite-waiting work but not section hints', () => {
  render(<ProjectCardDetails now={now} project={project([
    task('Blocked', null, { status: 'blocked' }),
    task('Waiting', '2026-10-25'),
    task('Ready'),
    task('Section hint only'),
  ], {
    projectManagementEnabled: true,
    planningLinks: [
      { prerequisite: { kind: 'task', id: 'Blocked' }, dependent: { kind: 'task', id: 'Waiting' } },
      { prerequisite: { kind: 'section', id: 's' }, dependent: { kind: 'task', id: 'Section hint only' } },
    ],
  })} />);
  expect(screen.getByText('Behind')).toBeInTheDocument();
  expect(screen.getByText('1 blocked')).toBeInTheDocument();
  const list = screen.getByRole('list');
  expect(list).toHaveTextContent('Ready');
  expect(list).toHaveTextContent('Section hint only');
  expect(within(list).queryByText('Waiting')).not.toBeInTheDocument();
  expect(within(list).queryByText('Blocked')).not.toBeInTheDocument();
});

it('labels blocked task-only projects without showing management health or enforcing inactive planning links', () => {
  render(<ProjectCardDetails now={now} project={project([task('Task', null, { status: 'blocked' })], {
    planningLinks: [
      { prerequisite: { kind: 'task', id: 'missing' }, dependent: { kind: 'task', id: 'Task' } },
    ],
  })} />);
  expect(screen.getByRole('list')).toHaveTextContent('Task');
  expect(screen.queryByText('Behind')).not.toBeInTheDocument();
  expect(screen.getByText('Blocked')).toBeInTheDocument();
  expect(screen.getByText('1 blocked')).toBeInTheDocument();
});

it('labels an overdue project deadline even when its task is not overdue', () => {
  render(<ProjectCardDetails now={now} project={project([task('Future', '2026-11-12')], {
    dueDate: '2026-10-26',
  })} />);
  expect(screen.getByText('Overdue')).toBeInTheDocument();
  expect(screen.queryByText('1 overdue')).not.toBeInTheDocument();
});

it.each([
  ['empty', project([]), 'No tasks yet', 'Add a task to get started.'],
  ['complete', project([task('Done', null, { done: true })]), '1/1 done', 'All tasks complete.'],
  ['waiting', project([task('Blocked', null, { status: 'blocked' })], { projectManagementEnabled: true }),
    '0/1 done', 'Waiting on prerequisites or blocked work.'],
  ['archived', project([task('Old task', '2020-01-01')], { archived: true }),
    'Archived', 'Restore this project to continue.'],
])('renders the %s state without misleading task previews', (_name, value, label, message) => {
  render(<ProjectCardDetails now={now} project={value} />);
  expect(screen.getByText(label)).toBeInTheDocument();
  expect(screen.getByText(message)).toBeInTheDocument();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  if (!value.subprojects[0]!.tasks.length) expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  if (value.archived) expect(screen.queryByText(/overdue/)).not.toBeInTheDocument();
});

it('shows limited member initials/photos and the project deadline including its year when needed', () => {
  render(<ProjectCardDetails now={now} project={project([], {
    dueDate: '2027-01-03',
    members: [
      { userId: '1', name: 'Lior V' },
      { userId: '2', name: 'Alex M', avatarUrl: '/avatar.png' },
      { userId: '3', name: 'Sam' },
      { userId: '4', name: 'Pat' },
    ],
  })} />);
  expect(screen.getByLabelText('4 project members')).toBeInTheDocument();
  expect(screen.getByLabelText('Lior V')).toHaveTextContent('LV');
  expect(screen.getByRole('img', { name: 'Alex M' })).toBeInTheDocument();
  expect(screen.getByText('+1')).toHaveAttribute('title', 'Pat');
  expect(screen.getByText(/Due .*2027/)).toHaveAttribute('datetime', '2027-01-03');
});
