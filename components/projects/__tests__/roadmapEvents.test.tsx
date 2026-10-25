import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ProjectItem } from '@myorg/types';
import ThumbButton from '../../../packages/ui/src/ThumbButton';
import ProjectRoadmap from '../ProjectRoadmap';
import { isRoadmapDate, validateRoadmapEvents } from '@/lib/projects/roadmapEvents';

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
  const result = render(<>
    <ThumbButton activeTab="projects" onClick={thumbClick} />
    <ProjectRoadmap project={value} links={[]} people={[]} canManage={canManage} onApplyChange={save} />
  </>);
  return { ...result, save, thumbClick };
}

function fab(label: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Roadmap actions' }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Roadmap actions' })).getByRole('button', { name: label }));
}

function day(offset: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) + offset * 86400000).toISOString().slice(0, 10);
}

it('uses a chevron to expand two labeled FABs without invoking the normal thumb action', () => {
  const { thumbClick } = setup();
  const thumb = screen.getByRole('button', { name: 'Roadmap actions' });
  expect(thumb).toHaveTextContent('expand_less');
  expect(thumb).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(thumb);
  expect(thumbClick).not.toHaveBeenCalled();
  expect(thumb).toHaveAttribute('aria-expanded', 'true');
  expect(thumb).toHaveTextContent('expand_more');
  const actions = within(screen.getByRole('group', { name: 'Roadmap actions' }));
  const addMilestone = actions.getByRole('button', { name: 'Add Milestone' });
  expect(addMilestone).toHaveAttribute('title', 'Add Milestone');
  expect(addMilestone).toHaveTextContent('star');
  const deadlineFab = actions.getByRole('button', { name: 'Add Deadline' });
  expect(deadlineFab.querySelector('svg path[fill="#fff"]')).toBeInTheDocument();
  expect(deadlineFab.querySelector('svg path[fill="#111"]')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('group', { name: 'Roadmap actions' })).not.toBeInTheDocument();
  expect(thumb).toHaveFocus();
  expect(thumb).toHaveTextContent('expand_less');
});

it('creates a named milestone from a roadmap task and saves table renames', () => {
  const { save } = setup();
  fab('Add Milestone');
  expect(screen.getByText('Select a task for the new milestone')).toHaveFocus();
  expect(screen.queryByRole('group', { name: 'Milestone task selection' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Select milestone task: Approve:/ }));
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
  expect(screen.getByText('Select a task for the new milestone')).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: /^Select milestone task: Approve:/ }));
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
  fireEvent.click(screen.getByRole('button', { name: 'Add task to Launch ready' }));
  fireEvent.click(screen.getByRole('button', { name: /^Select milestone task: Approve:/ }));
  expect(screen.getByRole('alert')).toHaveTextContent('already linked');
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /^Select milestone task: Publish:/ }));
  expect(save).toHaveBeenLastCalledWith({ milestones: [{ ...milestone, taskIds: ['a', 'b'] }] });
  expect(screen.getByRole('img', { name: `Milestone: Launch ready, ${day(5)}` })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Publish from Launch ready' }));
  expect(save).toHaveBeenLastCalledWith({ milestones: [milestone] });
});

it('cancels milestone selection without saving or offering a separate task picker', () => {
  const { save } = setup();
  fab('Add Milestone');
  fireEvent.keyDown(screen.getByRole('region', { name: 'Roadmap' }), { key: 'Escape' });
  expect(save).not.toHaveBeenCalled();
  fab('Add Milestone');
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
  fab('Add Deadline');
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

it('does not expose mutation controls to read-only users', () => {
  const { save } = setup({ ...project, milestones: [milestone], deadlines: [deadline] }, false);
  expect(screen.queryByRole('button', { name: 'Roadmap actions' })).not.toBeInTheDocument();
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
  for (const input of [
    { milestones: null }, { milestones: [{ ...milestone, taskIds: [] }] },
    { milestones: [{ ...milestone, taskIds: ['a', 'a'] }] },
    { milestones: [milestone, milestone] }, { milestones: [{ ...milestone, label: ' ' }] },
    { deadlines: [{ ...deadline, date: '2026-02-30' }] }, { deadlines: [deadline, deadline] },
  ]) expect(validateRoadmapEvents(input)).not.toBeNull();
});
