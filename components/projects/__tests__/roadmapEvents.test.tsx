import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ProjectItem } from '@myorg/types';
import ThumbButton from '../../../packages/ui/src/ThumbButton';
import ProjectRoadmap from '../ProjectRoadmap';
import ProjectPlan from '../ProjectPlan';
import { getMilestoneTaskIds, isRoadmapDate, validateRoadmapEvents } from '@/lib/projects/roadmapEvents';

const project: ProjectItem = {
  id: 'p', text: 'Release', color: '#1565c0',
  subprojects: [{ id: 's', text: 'Launch', tasks: [
    { id: 'a', text: 'Approve', done: false, effort: 2, favorite: false, dueDate: null, people: [] },
    { id: 'b', text: 'Publish', done: false, effort: 5, favorite: false, dueDate: null, people: [] },
    { id: 'c', text: 'Completed work', done: true, effort: 1, favorite: false, dueDate: null, people: [] },
  ] }],
};
const milestone = { id: 'm', label: 'Launch ready', taskIds: ['a'] };
const deadline = { id: 'd', label: 'Launch date', date: '2026-12-01' };

function setup(value = project, canManage = true) {
  const save = jest.fn();
  const thumbClick = jest.fn();
  function Workspace() {
    const [saved, setSaved] = React.useState(value);
    const apply = (patch: Partial<ProjectItem>) => {
      save(patch);
      setSaved(current => ({ ...current, ...patch }));
    };
    return <>
    <ThumbButton activeTab="projects" onClick={thumbClick} />
    <ProjectPlan project={saved} canManage={canManage} onApplyChange={apply} />
    <ProjectRoadmap project={saved} links={[]} people={[]} canManage={canManage} onApplyChange={apply} />
    </>;
  }
  const result = render(<Workspace />);
  return { ...result, save, thumbClick };
}

function selectMilestoneDependency(text: string) {
  fireEvent.click(within(screen.getByRole('table', { name: 'Project dependencies' }))
    .getByRole('button', { name: new RegExp(`^Select prerequisite: ${text} \\(`) }));
}

function day(offset: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) + offset * 86400000).toISOString().slice(0, 10);
}

it.each([true, false])('marks completed milestone tasks with a leading shared check (canManage=%s)', canManage => {
  setup({ ...project, milestones: [{ ...milestone, taskIds: ['a', 'c', 'deleted'] }] }, canManage);
  const table = within(screen.getByRole('table', { name: 'Milestones' }));
  const text = table.getByText('Completed work');
  const icon = within(text.parentElement!).getByRole('img', { name: 'Completed task' });
  expect(icon.tagName.toLowerCase()).toBe('svg');
  expect(icon).toHaveClass('completed');
  expect(icon.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(table.getAllByRole('img', { name: 'Completed task' })).toHaveLength(1);
  expect(table.getByText('Deleted task')).toBeInTheDocument();
});

it('opens Roadmap documentation from the thumb and keeps milestone creation in Plan', () => {
  const { thumbClick } = setup();
  const thumb = screen.getByRole('button', { name: 'Roadmap help' });
  expect(thumb).toHaveTextContent('help_outline');
  fireEvent.click(thumb);
  expect(thumbClick).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog', { name: 'Project Roadmap' });
  expect(dialog.parentElement).toHaveClass('overlay');
  expect(dialog).toHaveTextContent('See the schedule');
  expect(dialog).toHaveTextContent('Project or person.');
  expect(dialog).toHaveTextContent('Milestones and deadlines.');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog', { name: 'Project Roadmap' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Release project plan' })).toContainElement(screen.getByRole('button', { name: 'Add Milestone' }));
  expect(screen.getByRole('region', { name: 'Roadmap' })).not.toContainElement(screen.getByRole('table', { name: 'Milestones' }));
  expect(screen.queryByRole('group', { name: 'Roadmap actions' })).not.toBeInTheDocument();
});

it('creates a named milestone from a roadmap task and saves table renames', () => {
  const { save } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Add Milestone' }));
  expect(screen.getByText('Select a task or section in the Dependency Table for the milestone')).toHaveFocus();
  expect(screen.queryByRole('group', { name: 'Milestone task selection' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  selectMilestoneDependency('Approve');
  expect(save).toHaveBeenLastCalledWith({ milestones: [{ id: expect.any(String), label: 'Approve', taskIds: ['a'] }] });
  expect(screen.getByRole('img', { name: `Milestone: Approve, ${day(2)}` })).toHaveTextContent('star');
  const name = screen.getByRole('textbox', { name: 'Milestone name: Approve' });
  fireEvent.change(name, { target: { value: 'Ready to launch' } });
  fireEvent.blur(name);
  expect(save).toHaveBeenLastCalledWith({ milestones: [{ id: expect.any(String), label: 'Ready to launch', taskIds: ['a'] }] });
  expect(screen.getByRole('img', { name: `Milestone: Ready to launch, ${day(2)}` })).toBeInTheDocument();
});

it('starts milestone selection from the table Add button and restores focus after selection', () => {
  const { save } = setup();
  const add = screen.getByRole('button', { name: 'Add Milestone' });
  fireEvent.click(add);
  expect(screen.getByText('Select a task or section in the Dependency Table for the milestone')).toHaveFocus();
  selectMilestoneDependency('Approve');
  expect(save).toHaveBeenCalledWith({ milestones: [{ id: expect.any(String), label: 'Approve', taskIds: ['a'] }] });
  expect(add).toHaveFocus();
});

it('opens deadline entry from the table Add button and restores focus on cancel', () => {
  setup();
  const add = screen.getByRole('button', { name: 'Add Deadline' });
  fireEvent.click(add);
  const dialog = screen.getByRole('dialog', { name: 'Add Deadline' });
  expect(within(dialog).getByLabelText('Name')).toHaveFocus();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(add).toHaveFocus();
});

it('adds multiple dependencies and moves the milestone to the latest task finish', () => {
  const { save } = setup({ ...project, milestones: [milestone] });
  const add = screen.getByRole('button', { name: 'Add dependency to Launch ready' });
  const icon = add.querySelector('.material-icons');
  expect(icon).toHaveTextContent('add');
  expect(icon).toHaveAttribute('aria-hidden', 'true');
  expect(add).not.toHaveTextContent('Add task');
  expect(add.parentElement).toBe(screen.getByRole('table', { name: 'Milestones' }).querySelector('li:last-child'));
  expect(add.previousElementSibling).toHaveTextContent('Approve');
  fireEvent.click(add);
  selectMilestoneDependency('Approve');
  expect(screen.getByRole('alert')).toHaveTextContent('Already linked');
  expect(save).not.toHaveBeenCalled();
  selectMilestoneDependency('Publish');
  expect(save).toHaveBeenLastCalledWith({ milestones: [{ ...milestone, taskIds: ['a', 'b'] }] });
  expect(screen.getByRole('img', { name: `Milestone: Launch ready, ${day(5)}` })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Add dependency to Launch ready' })).toHaveLength(1);
  expect(add.parentElement).toContainElement(within(screen.getByRole('table', { name: 'Milestones' })).getByText('Publish'));
  expect(add).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Publish from Launch ready' }));
  expect(save).toHaveBeenLastCalledWith({ milestones: [milestone] });
});

it('does not show the milestone add-task control in read-only projects', () => {
  setup({ ...project, milestones: [milestone] }, false);
  const table = within(screen.getByRole('table', { name: 'Milestones' }));
  expect(table.getByText('Approve')).toBeInTheDocument();
  expect(table.queryByRole('button', { name: 'Add dependency to Launch ready' })).not.toBeInTheDocument();
});

it('restores focus to the inline plus when task selection is cancelled', () => {
  const { save } = setup({ ...project, milestones: [milestone] });
  const add = screen.getByRole('button', { name: 'Add dependency to Launch ready' });
  fireEvent.click(add);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(add).toHaveFocus();
  expect(save).not.toHaveBeenCalled();
});

it('cancels milestone selection in Plan without saving or offering a separate task picker', () => {
  const { save } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Add Milestone' }));
  fireEvent.keyDown(screen.getByRole('region', { name: 'Release project plan' }), { key: 'Escape' });
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Add Milestone' }));
  expect(screen.queryByRole('button', { name: 'Completed work (completed)' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(save).not.toHaveBeenCalled();
});

it('aligns dotted deadline guides to their date markers in both roadmap views', () => {
  const { container } = setup({ ...project, milestones: [milestone], deadlines: [
    { ...deadline, date: day(3) }, { id: 'd2', label: 'Earlier date', date: day(-2) },
  ] });
  const verify = () => {
    const lines = container.querySelectorAll<HTMLElement>('.deadlineLine');
    expect(lines).toHaveLength(2);
    ['Launch date', 'Earlier date'].forEach((label, index) => {
      const marker = screen.getByRole('img', { name: new RegExp(`^Deadline: ${label},`) });
      expect(lines[index]!.style.left).toBe(marker.style.left);
    });
    expect(container.querySelector('.deadlineGuides')).toHaveAttribute('aria-hidden', 'true');
  };
  verify();
  fireEvent.click(screen.getByRole('button', { name: 'By person' }));
  verify();
});

it('adds a date-only deadline even without tasks, then edits its date and name', () => {
  const { save } = setup({ ...project, subprojects: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Add Deadline' }));
  const dialog = screen.getByRole('dialog', { name: 'Add Deadline' });
  fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Ship' } });
  fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: day(30) } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add Deadline' }));
  expect(save).toHaveBeenLastCalledWith({ deadlines: [{ id: expect.any(String), label: 'Ship', date: day(30) }] });
  expect(screen.getByRole('img', { name: `Deadline: Ship, ${day(30)}` }).querySelector('svg')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Deadline date: Ship'), { target: { value: day(-3) } });
  expect(screen.getByRole('img', { name: `Deadline: Ship, ${day(-3)}` })).toBeInTheDocument();
  const name = screen.getByLabelText('Deadline name: Ship');
  fireEvent.change(name, { target: { value: 'Release date' } });
  fireEvent.blur(name);
  expect(save).toHaveBeenLastCalledWith({ deadlines: [{ id: expect.any(String), label: 'Release date', date: day(-3) }] });
});

it.each(['Milestones', 'Deadlines'] as const)('confirms clearing %s without affecting the other table or tasks', kind => {
  const { save } = setup({ ...project, milestones: [milestone], deadlines: [deadline] });
  const button = screen.getByRole('button', { name: `Clear ${kind}` });
  expect(button).toHaveClass('roadmapClearButton');
  fireEvent.click(button);
  let dialog = screen.getByRole('dialog', { name: `Clear all ${kind.toLowerCase()}?` });
  expect(within(dialog).getByRole('button', { name: `Clear ${kind}` })).toHaveClass('roadmapClearButton');
  expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(save).not.toHaveBeenCalled();
  expect(button).toHaveFocus();
  fireEvent.click(button);
  dialog = screen.getByRole('dialog', { name: `Clear all ${kind.toLowerCase()}?` });
  fireEvent.click(within(dialog).getByRole('button', { name: `Clear ${kind}` }));
  expect(save).toHaveBeenLastCalledWith({ [kind.toLowerCase()]: [] });
  expect(screen.getByRole('table', { name: kind === 'Milestones' ? 'Deadlines' : 'Milestones' })).toHaveTextContent(kind === 'Milestones' ? 'Date' : 'Approve');
  expect(screen.getByRole('button', { name: /^Approve:/ })).toBeInTheDocument();
});

it('shows missing dependencies explicitly without plotting a misleading milestone', () => {
  setup({ ...project, milestones: [{ ...milestone, taskIds: ['deleted'] }] });
  expect(screen.getByRole('table', { name: 'Milestones' })).toHaveTextContent('Deleted task');
  expect(screen.queryByRole('img', { name: /Milestone:/ })).not.toBeInTheDocument();
});

it('places Milestones and its Add/Clear controls after the Dependency Table, without moving Deadlines', () => {
  setup();
  const plan = screen.getByRole('region', { name: 'Release project plan' });
  const dependencies = within(plan).getByRole('table', { name: 'Project dependencies' });
  const heading = within(plan).getByRole('heading', { name: 'Milestones' });
  expect(dependencies.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(heading.parentElement).toContainElement(screen.getByRole('button', { name: 'Add Milestone' }));
  expect(heading.parentElement).toContainElement(screen.getByRole('button', { name: 'Clear Milestones' }));
  expect(within(plan).queryByRole('table', { name: 'Deadlines' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Roadmap' })).toContainElement(screen.getByRole('table', { name: 'Deadlines' }));
});

it('creates section milestones and adds task dependencies using the same Dependency Table picker', () => {
  const { save } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Add Milestone' }));
  selectMilestoneDependency('Launch');
  expect(save).toHaveBeenLastCalledWith({ milestones: [{ id: expect.any(String), label: 'Launch', taskIds: [], sectionIds: ['s'] }] });
  const table = within(screen.getByRole('table', { name: 'Milestones' }));
  expect(table.getByText('Launch (section)')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: `Milestone: Launch, ${day(5)}` })).toBeInTheDocument();
  fireEvent.click(table.getByRole('button', { name: 'Add dependency to Launch' }));
  selectMilestoneDependency('Launch');
  expect(screen.getByRole('alert')).toHaveTextContent('Already linked');
  selectMilestoneDependency('Completed work');
  expect(save.mock.calls.at(-1)![0].milestones[0]).toMatchObject({ taskIds: ['c'], sectionIds: ['s'] });
  fireEvent.click(table.getByRole('button', { name: 'Remove Launch from Launch' }));
  expect(save.mock.calls.at(-1)![0].milestones[0]).toMatchObject({ taskIds: ['c'], sectionIds: [] });
});

it('resolves section dependencies dynamically, deduplicates tasks and rejects missing sections', () => {
  const value = { ...milestone, taskIds: ['a'], sectionIds: ['s'] };
  expect(getMilestoneTaskIds(value, project.subprojects)).toEqual(['a', 'b', 'c']);
  expect(getMilestoneTaskIds(value, [])).toBeNull();
  expect(getMilestoneTaskIds(value, [{ ...project.subprojects[0]!, tasks: [...project.subprojects[0]!.tasks,
    { ...project.subprojects[0]!.tasks[0]!, id: 'new' }] }])).toEqual(['a', 'b', 'c', 'new']);
});

it('does not plot a milestone with a deleted section, and labels that dependency in Plan', () => {
  setup({ ...project, milestones: [{ ...milestone, taskIds: [], sectionIds: ['deleted'] }] });
  expect(screen.getByRole('table', { name: 'Milestones' })).toHaveTextContent('Deleted section');
  expect(screen.queryByRole('img', { name: /Milestone:/ })).not.toBeInTheDocument();
});

it('does not expose mutation controls to read-only users', () => {
  const { save } = setup({ ...project, milestones: [milestone], deadlines: [deadline] }, false);
  expect(screen.getByRole('button', { name: 'Roadmap help' })).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add Milestone' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add Deadline' })).not.toBeInTheDocument();
  act(() => window.dispatchEvent(new Event('roadmap-add-milestone')));
  expect(screen.queryByText('Select a task for the new milestone')).not.toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});

it('validates real calendar dates, event shapes and duplicate IDs/dependencies', () => {
  expect(isRoadmapDate('2026-02-30')).toBe(false);
  expect(isRoadmapDate('2028-02-29')).toBe(true);
  expect(validateRoadmapEvents({ milestones: [milestone], deadlines: [deadline] })).toBeNull();
  expect(validateRoadmapEvents({ milestones: [{ ...milestone, taskIds: [], sectionIds: ['s'] }] })).toBeNull();
  for (const input of [
    { milestones: null }, { milestones: [{ ...milestone, taskIds: [] }] },
    { milestones: [{ ...milestone, taskIds: ['a', 'a'] }] },
    { milestones: [milestone, milestone] }, { milestones: [{ ...milestone, label: ' ' }] },
    { milestones: [{ ...milestone, sectionIds: null }] },
    { milestones: [{ ...milestone, sectionIds: ['s', 's'] }] },
    { milestones: [{ ...milestone, sectionIds: [''] }] },
    { deadlines: [{ ...deadline, date: '2026-02-30' }] }, { deadlines: [deadline, deadline] },
  ]) expect(validateRoadmapEvents(input)).not.toBeNull();
});
