import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ProjectItem } from '@myorg/types';
import ProjectRoadmap, { readableTextColor } from '../ProjectRoadmap';
import type { PlanLink } from '@/lib/projects/planning';

const project: ProjectItem = {
  id: 'p', text: 'Release', color: '#1565c0',
  subprojects: [{ id: 's', text: 'Launch', tasks: [
    { id: 'done', text: 'Already finished', done: true, effort: 20, favorite: false, dueDate: null, people: [{ name: 'Alex' }] },
    { id: 'a', text: 'Approve', done: false, effort: 2, favorite: false, dueDate: null, people: [{ name: 'Alex' }] },
    { id: 'b', text: 'Publish', done: false, effort: 0.5, favorite: false, dueDate: null, people: [{ name: 'Alex' }, { name: 'Sam' }] },
    { id: 'c', text: 'Review', done: false, favorite: false, dueDate: null, people: [] },
    { id: 'zero', text: 'Milestone', done: false, effort: 0, favorite: false, dueDate: null, people: [] },
  ] }],
};
const links = [
  { prerequisite: { kind: 'task' as const, id: 'done' }, dependent: { kind: 'task' as const, id: 'a' } },
  { prerequisite: { kind: 'task' as const, id: 'a' }, dependent: { kind: 'task' as const, id: 'b' } },
];

function summary(label: string) {
  return screen.getByText(label).nextElementSibling;
}

it('shows warnings only for unmitigated risks in both groupings without selecting the task', () => {
  const onShowUnmitigatedRisks = jest.fn();
  const withRisks = { ...project, subprojects: project.subprojects.map(section => ({
    ...section, tasks: section.tasks.map(task => ({ ...task, risks: task.id === 'b'
      ? [{ id: 'r', name: 'Delay', description: '', mitigations: [] }]
      : [{ id: `r-${task.id}`, name: 'Covered', description: '', mitigations: [{ id: 'm', text: 'Backup' }] }] })),
  })) };
  const { rerender } = render(<ProjectRoadmap project={withRisks} links={links} people={[]} canManage
    onShowUnmitigatedRisks={onShowUnmitigatedRisks} />);
  const warning = screen.getByRole('button', { name: 'View unmitigated risks for Publish' });
  const bar = screen.getByRole('button', { name: /^Publish:/ });
  expect(bar).toHaveClass('riskBar');
  expect(bar).toHaveStyle({ borderColor: '#c5221f' });
  expect(warning.parentElement).toBe(bar.parentElement);
  expect(warning.closest('.roadmapLabel')).toBeNull();
  expect(warning.closest('button')).toBe(warning);
  expect(screen.getByRole('button', { name: /^Approve:/ })).not.toHaveClass('riskBar');
  expect(screen.queryByRole('button', { name: 'View unmitigated risks for Approve' })).not.toBeInTheDocument();
  fireEvent.click(warning);
  expect(onShowUnmitigatedRisks).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: /^Publish:/ })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'By person' }));
  expect(screen.getAllByRole('button', { name: 'View unmitigated risks for Publish' })).toHaveLength(2);
  rerender(<ProjectRoadmap project={project} links={links} people={[]} canManage
    onShowUnmitigatedRisks={onShowUnmitigatedRisks} />);
  expect(screen.queryByRole('button', { name: 'View unmitigated risks for Publish' })).not.toBeInTheDocument();
});

it('hides completed tasks and summarizes remaining sized effort separately from unsized tasks', () => {
  render(<ProjectRoadmap project={project} links={links} people={[]} />);
  expect(screen.getByRole('region', { name: 'Roadmap' }).querySelector('[data-tab-swipe-ignore]')).toBeInTheDocument();
  expect(screen.queryByRole('img', { name: /Already finished:/ })).not.toBeInTheDocument();
  expect(summary('Sized effort remaining')).toHaveTextContent('2.5 days');
  expect(summary('Unsized tasks')).toHaveTextContent('1');
  const today = new Date();
  const expected = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) + 2.5 * 86400000).toISOString().slice(0, 10);
  expect(summary('Expected completion')).toHaveTextContent(expected);
});

it('uses different consecutive bar colors and displays effort inside every bar, including milestones', () => {
  render(<ProjectRoadmap project={project} links={links} people={[]} />);
  const approval = screen.getByRole('img', { name: /Approve:.*2 days/ });
  const publish = screen.getByRole('img', { name: /Publish:.*0.5 days/ });
  expect(approval.closest('[aria-label^="Dependency chain"]')).toBe(publish.closest('[aria-label^="Dependency chain"]'));
  expect(approval.style.backgroundColor).not.toBe(publish.style.backgroundColor);
  expect(within(approval).getByText('2d')).toBeInTheDocument();
  expect(within(publish).getByText('0.5d')).toBeInTheDocument();
  expect(within(screen.getByRole('img', { name: /Review:/ })).getByText('~1d')).toBeInTheDocument();
  expect(within(screen.getByRole('img', { name: /Milestone:/ })).getByText('0d')).toBeInTheDocument();
});

it('uses white text on dark bars and dark text on light bars', () => {
  expect(readableTextColor('#1565c0')).toBe('#ffffff');
  expect(readableTextColor('#37474f')).toBe('#ffffff');
  expect(readableTextColor('#ad4800')).toBe('#ffffff');
  expect(readableTextColor('#ffeb3b')).toBe('#1f1f1f');
  expect(readableTextColor('#fff')).toBe('#1f1f1f');
  render(<ProjectRoadmap project={project} links={links} people={[]} />);
  screen.getAllByRole('img', { name: /days/ }).forEach(bar => expect(bar).toHaveStyle({ color: '#ffffff' }));
});

it('groups by assignee, includes unassigned work and keeps original forecast dates and totals', () => {
  render(<ProjectRoadmap project={project} links={links} people={[]} />);
  const publish = screen.getByRole('img', { name: /Publish:/ });
  const originalDates = publish.getAttribute('aria-label');
  const originalLeft = publish.parentElement!.style.left;
  fireEvent.click(screen.getByRole('button', { name: 'By person' }));
  expect(screen.getByRole('button', { name: 'By person' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Alex' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Sam' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Unassigned' })).toBeInTheDocument();
  const copies = screen.getAllByRole('img', { name: /Publish:/ });
  expect(copies).toHaveLength(2);
  for (const copy of copies) {
    expect(copy).toHaveAttribute('aria-label', originalDates);
    expect(copy.parentElement!.style.left).toBe(originalLeft);
  }
  expect(summary('Sized effort remaining')).toHaveTextContent('2.5 days');
  expect(summary('Unsized tasks')).toHaveTextContent('1');
  fireEvent.click(screen.getByRole('button', { name: 'Across project' }));
  expect(screen.getAllByRole('img', { name: /Publish:/ })).toHaveLength(1);
  expect(screen.queryByRole('heading', { name: 'Alex' })).not.toBeInTheDocument();
});

it('shows an empty remaining-work state and zero totals when everything is complete', () => {
  const completed = { ...project, subprojects: project.subprojects.map(section => ({
    ...section, tasks: section.tasks.map(task => ({ ...task, done: true })),
  })) };
  render(<ProjectRoadmap project={completed} links={links} people={[]} />);
  expect(screen.getByText('No remaining tasks.')).toBeInTheDocument();
  expect(summary('Sized effort remaining')).toHaveTextContent('0 days');
  expect(summary('Unsized tasks')).toHaveTextContent('0');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

it('does not present a success-shaped completion date for an invalid plan', () => {
  render(<ProjectRoadmap project={project} links={[...links, { prerequisite: { kind: 'task', id: 'b' }, dependent: { kind: 'task', id: 'a' } }]} people={[]} />);
  expect(screen.getByRole('alert')).toHaveTextContent('cycle');
  expect(summary('Expected completion')).toHaveTextContent('Unavailable');
});

describe('roadmap task actions', () => {
  beforeAll(() => { HTMLElement.prototype.scrollIntoView = jest.fn(); });

  function renderManaged(overrides: Partial<React.ComponentProps<typeof ProjectRoadmap>> = {}) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onSaveLink = jest.fn(async (_action: 'add' | 'remove', link: PlanLink): Promise<PlanLink[]> => [...links, link]);
    const onApplyChange = jest.fn();
    render(<ProjectRoadmap project={project} links={links} people={[]} canManage actionsContainer={container}
      onSaveLink={onSaveLink} onApplyChange={onApplyChange} {...overrides} />);
    return { container, onSaveLink, onApplyChange };
  }

  it('shows Edit and Add dependency in the header when a bar is clicked', () => {
    const { container } = renderManaged();
    expect(within(container).queryByRole('group')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Review:/ }));
    expect(screen.getByRole('button', { name: /^Review:/ })).toHaveAttribute('aria-pressed', 'true');
    const actions = within(container).getByRole('group', { name: 'Selected roadmap task' });
    expect(actions).toHaveTextContent('Review');
    expect(within(actions).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Add dependency' })).toBeInTheDocument();
  });

  it('adds a dependency by clicking another bar', async () => {
    const { container, onSaveLink } = renderManaged();
    fireEvent.click(screen.getByRole('button', { name: /^Review:/ }));
    fireEvent.click(within(container).getByRole('button', { name: 'Add dependency' }));
    expect(screen.getByText('Select what Review depends on')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Select prerequisite: Publish:/ }));
    expect(screen.queryByText('Select what Review depends on')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saving…');
    await waitFor(() => expect(onSaveLink).toHaveBeenCalledWith('add', { dependent: { kind: 'task', id: 'c' }, prerequisite: { kind: 'task', id: 'b' } }));
    expect(await screen.findByText('Review depends on Publish. Saved.')).toBeInTheDocument();
    expect(screen.queryByText('Select what Review depends on')).not.toBeInTheDocument();
  });

  it('rejects cycles and self links without saving, and Escape cancels selection', () => {
    const { container, onSaveLink } = renderManaged();
    fireEvent.click(screen.getByRole('button', { name: /^Approve:/ }));
    fireEvent.click(within(container).getByRole('button', { name: 'Add dependency' }));
    fireEvent.click(screen.getByRole('button', { name: /^Select prerequisite: Approve:/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a different task.');
    fireEvent.click(screen.getByRole('button', { name: /^Select prerequisite: Publish:/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/cycle/i);
    expect(onSaveLink).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByText('Select what Approve depends on'), { key: 'Escape' });
    expect(screen.queryByText('Select what Approve depends on')).not.toBeInTheDocument();
  });

  it('limits owners to project members and opens the task dialog', () => {
    const { container } = renderManaged({
      project: { ...project, members: [{ userId: 'u1', name: 'Alex' }] },
      people: [{ id: 'contact', name: 'Outside Olly', status: 'linked' }],
    });
    fireEvent.click(screen.getByRole('button', { name: /^Publish:/ }));
    fireEvent.click(within(container).getByRole('button', { name: 'Edit' }));
    const editor = screen.getByRole('dialog', { name: 'Edit task' });
    expect(within(editor).getByTitle('Alex')).toBeInTheDocument();
    expect(within(editor).queryByTitle('Outside Olly')).not.toBeInTheDocument();
  });
  it('edits the task from a dialog', () => {
    const { container, onApplyChange } = renderManaged();
    fireEvent.click(screen.getByRole('button', { name: /^Publish:/ }));
    fireEvent.click(within(container).getByRole('button', { name: 'Edit' }));
    const editor = screen.getByRole('dialog', { name: 'Edit task' });
    const title = within(editor).getByRole('textbox', { name: 'Task title' });
    expect(title).toHaveFocus();
    fireEvent.change(title, { target: { value: 'Publish release' } });
    const tasks = onApplyChange.mock.calls.at(-1)![0].subprojects[0].tasks;
    expect(tasks.find((task: { id: string }) => task.id === 'b').text).toBe('Publish release');
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
    fireEvent.click(within(editor).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog', { name: 'Edit task' })).not.toBeInTheDocument();
  });
});
