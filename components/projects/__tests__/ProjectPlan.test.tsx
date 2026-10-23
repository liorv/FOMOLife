import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ProjectItem } from '@myorg/types';
import ProjectPlan from '../ProjectPlan';
import ProjectRoadmap from '../ProjectRoadmap';
import type { PlanLink } from '@/lib/projects/planning';

const link: PlanLink = { prerequisite: { kind: 'task', id: 'a' }, dependent: { kind: 'task', id: 'b' } };
const project: ProjectItem = {
  id: 'p', text: 'Release', color: '#123',
  subprojects: [
    { id: 'prepare', text: 'Prepare', tasks: [
      { id: 'a', text: 'Get approval', done: false, favorite: false, dueDate: '2026-11-05', people: [] },
      { id: 'b', text: 'Publish', done: false, favorite: false, dueDate: '2026-11-01', people: [] },
      { id: 'repeat', text: 'Weekly review', done: false, favorite: false, dueDate: null, people: [], recurrence: 'weekly' },
    ] },
    { id: 'launch', text: 'Launch', tasks: [] },
  ],
};

afterEach(() => jest.restoreAllMocks());

function savedResponse(links: PlanLink[]) {
  const response = Response.json({ ...project, planningLinks: links });
  Object.defineProperty(response, 'ok', { value: true });
  return response;
}

function startDependency() {
  fireEvent.click(screen.getByRole('button', { name: 'Add dependency for Publish (task, Prepare)' }));
  expect(screen.getByText('Select what it depends on')).toHaveFocus();
}

function table() {
  return within(screen.getByRole('table', { name: 'Project dependencies' }));
}

it('shows a dense section/task table without steps, an inspector, or advanced filters', () => {
  render(<ProjectPlan project={project} canManage />);
  const table = screen.getByRole('table', { name: 'Project dependencies' });
  expect(within(table).getByRole('columnheader', { name: 'Depends on' })).toBeInTheDocument();
  expect(within(table).getAllByRole('row')).toHaveLength(6);
  expect(within(table).getAllByRole('button', { name: /^Add dependency for/ })).toHaveLength(5);
  const addLink = within(table).getByRole('button', { name: 'Add dependency for Publish (task, Prepare)' });
  expect(addLink.querySelector('.material-icons')).toHaveTextContent('add_link');
  expect(addLink).toHaveAttribute('title', 'Add dependency for Publish');
  expect(screen.getByRole('button', { name: 'Inspect: Launch (section, Section)' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Inspect: Get approval (task, Prepare)' })).toBeInTheDocument();
  expect(screen.queryByText(/Step \d/)).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add dependency' })).not.toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Plan visualization' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Sequence' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Map' })).not.toBeInTheDocument();
});

it('selects the dependent first, highlights it, then saves the chosen prerequisite inline', async () => {
  const saved = jest.fn();
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(savedResponse([link]));
  render(<ProjectPlan project={project} canManage onLinksSaved={saved} />);
  expect(screen.queryByText(/do not block completion/)).not.toBeInTheDocument();
  startDependency();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.getByText('Select what it depends on')).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Select prerequisite: Publish (task, Prepare)' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Select prerequisite: Get approval (task, Prepare)' }));
  await waitFor(() => expect(saved).toHaveBeenCalledWith([link]));
  expect(fetchMock).toHaveBeenCalledWith('/api/projects/p/plan', expect.objectContaining({ method: 'PATCH' }));
  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ action: 'add', link });
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Publish depends on Get approval. Saved.'));
  expect(screen.getByRole('button', { name: 'Remove dependency: Publish depends on Get approval' })).toBeInTheDocument();
  expect(screen.getByText(/Deadline conflict/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add dependency for Publish (task, Prepare)' })).toHaveFocus();
  expect(project.subprojects[0]!.tasks.every(task => !task.done)).toBe(true);
});

it('links an empty section as the prerequisite', async () => {
  const hint: PlanLink = { prerequisite: { kind: 'section', id: 'launch' }, dependent: { kind: 'task', id: 'b' } };
  const save = jest.fn().mockResolvedValue([hint]);
  render(<ProjectPlan project={project} canManage onSaveLink={save} />);
  startDependency();
  fireEvent.click(screen.getByRole('button', { name: 'Select prerequisite: Launch (section, Section)' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('add', hint));
  expect(await screen.findByText('Section hint')).toBeInTheDocument();
});

it('allows a section to depend on a task', async () => {
  const hint: PlanLink = { prerequisite: { kind: 'task', id: 'a' }, dependent: { kind: 'section', id: 'launch' } };
  const save = jest.fn().mockResolvedValue([hint]);
  render(<ProjectPlan project={project} canManage onSaveLink={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add dependency for Launch (section, Section)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Select prerequisite: Get approval (task, Prepare)' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('add', hint));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Launch depends on Get approval. Saved.'));
});

it('cancels prerequisite selection with Escape without saving', () => {
  const save = jest.fn();
  render(<ProjectPlan project={project} canManage onSaveLink={save} />);
  startDependency();
  fireEvent.keyDown(screen.getByRole('region', { name: 'Release project plan' }), { key: 'Escape' });
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add dependency for Publish (task, Prepare)' })).toHaveFocus();
  expect(save).not.toHaveBeenCalled();
});

it('cancels with the Cancel button and starts a fresh selection', () => {
  render(<ProjectPlan project={project} canManage />);
  startDependency();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: 'Inspect: Publish (task, Prepare)' })).toHaveAttribute('aria-pressed', 'false');
  startDependency();
  expect(screen.getByText('Select what it depends on')).toBeInTheDocument();
});

it('prevents recurring task requirements and self-links, but still offers section hints', () => {
  const save = jest.fn();
  render(<ProjectPlan project={project} canManage onSaveLink={save} />);
  startDependency();
  const recurring = screen.getByRole('button', { name: 'Select prerequisite: Weekly review (task, Prepare)' });
  expect(recurring).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByText(/Recurring tasks cannot be task requirements/)).toBeInTheDocument();
  fireEvent.click(recurring);
  expect(screen.getByRole('alert')).toHaveTextContent('Recurring tasks cannot be task requirements');
  const self = screen.getByRole('button', { name: 'Select prerequisite: Publish (task, Prepare)' });
  expect(self).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(self);
  expect(screen.getByRole('alert')).toHaveTextContent('cannot depend on itself');
  expect(screen.getByRole('button', { name: 'Select prerequisite: Launch (section, Section)' })).toHaveAttribute('aria-disabled', 'false');
  expect(save).not.toHaveBeenCalled();
});

it('prevents duplicate links and dependency cycles', () => {
  const save = jest.fn();
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage onSaveLink={save} />);
  startDependency();
  const duplicate = table().getByRole('button', { name: 'Select prerequisite: Get approval (task, Prepare)' });
  expect(duplicate).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(duplicate);
  expect(screen.getByRole('alert')).toHaveTextContent('Already linked');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add dependency for Get approval (task, Prepare)' }));
  fireEvent.click(table().getByRole('button', { name: 'Select prerequisite: Publish (task, Prepare)' }));
  expect(screen.getByRole('alert')).toHaveTextContent('dependency cycle');
  expect(save).not.toHaveBeenCalled();
});

it('undoes an optimistic dependency when saving fails and allows retry', async () => {
  const saved = jest.fn();
  const save = jest.fn().mockRejectedValueOnce(new Error('Offline; retry when connected')).mockResolvedValue([link]);
  render(<ProjectPlan project={project} canManage onLinksSaved={saved} onSaveLink={save} />);
  startDependency();
  fireEvent.click(screen.getByRole('button', { name: 'Select prerequisite: Get approval (task, Prepare)' }));
  expect(screen.getByRole('button', { name: 'Remove dependency: Publish depends on Get approval' })).toBeInTheDocument();
  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save: Publish depends on Get approval. Offline; retry when connected The change was undone.");
  expect(saved).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /Remove dependency/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss save error' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  startDependency();
  fireEvent.click(screen.getByRole('button', { name: 'Select prerequisite: Get approval (task, Prepare)' }));
  await waitFor(() => expect(saved).toHaveBeenCalledWith([link]));
  expect(screen.getByRole('status')).toHaveTextContent('Publish depends on Get approval. Saved.');
});

it('shows a dependency immediately and confirms once the background save finishes', async () => {
  let resolveSave!: (links: PlanLink[]) => void;
  const save = jest.fn(() => new Promise<PlanLink[]>(resolve => { resolveSave = resolve; }));
  render(<ProjectPlan project={project} canManage onSaveLink={save} />);
  startDependency();
  fireEvent.click(screen.getByRole('button', { name: 'Select prerequisite: Get approval (task, Prepare)' }));
  expect(screen.queryByText('Select what it depends on')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove dependency: Publish depends on Get approval' })).toBeEnabled();
  expect(screen.getByRole('status')).toHaveTextContent('Saving…');
  expect(screen.getByRole('button', { name: 'Add dependency for Get approval (task, Prepare)' })).toBeEnabled();
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  resolveSave([link]);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Publish depends on Get approval. Saved.'));
});

it('saves rapid dependency changes in order and keeps the latest local state', async () => {
  const resolvers: Array<(links: PlanLink[]) => void> = [];
  const save = jest.fn(() => new Promise<PlanLink[]>(resolve => { resolvers.push(resolve); }));
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage onSaveLink={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove dependency: Publish depends on Get approval' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add dependency for Publish (task, Prepare)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Select prerequisite: Launch (section, Section)' }));
  const hint: PlanLink = { dependent: link.dependent, prerequisite: { kind: 'section', id: 'launch' } };
  expect(screen.getByRole('button', { name: 'Remove dependency: Publish depends on Launch' })).toBeInTheDocument();
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save).toHaveBeenLastCalledWith('remove', link);
  resolvers[0]!([]);
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save).toHaveBeenLastCalledWith('add', hint);
  expect(screen.getByRole('button', { name: 'Remove dependency: Publish depends on Launch' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Saving…');
  resolvers[1]!([hint]);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Publish depends on Launch. Saved.'));
  expect(screen.queryByRole('button', { name: 'Remove dependency: Publish depends on Get approval' })).not.toBeInTheDocument();
});

it('renders the map and keeps a read-only plan read-only', () => {
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage={false} />);
  expect(screen.queryByRole('button', { name: 'Add dependency' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Remove dependency/ })).not.toBeInTheDocument();
  const map = screen.getByRole('region', { name: 'Dependency map' });
  expect(within(map).getByRole('button', { name: /Inspect: Get approval/ })).toBeInTheDocument();
  expect(map.querySelectorAll('path[stroke="currentColor"]')).toHaveLength(1);
  const mapNodes = map.querySelectorAll('foreignObject');
  expect(mapNodes).toHaveLength(2);
  mapNodes.forEach(node => {
    expect(Number(node.getAttribute('width'))).toBeLessThanOrEqual(160);
    expect(Number(node.getAttribute('height'))).toBeLessThanOrEqual(44);
  });
  expect(map.querySelector('path[stroke="currentColor"]')).toHaveAttribute('d', 'M 168 34 C 184 34, 188 34, 204 34');
  expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument();
  const svg = map.querySelector('svg')!;
  const initialWidth = Number(svg.getAttribute('width'));
  fireEvent.wheel(map, { deltaY: -100 });
  expect(Number(svg.getAttribute('width'))).toBeGreaterThan(initialWidth);
  fireEvent.wheel(map, { deltaY: 100 });
  expect(Number(svg.getAttribute('width'))).toBeCloseTo(initialWidth);
});

it('shows the map above the table without a second dependency list and supports map selection', async () => {
  const hint: PlanLink = { prerequisite: { kind: 'task', id: 'a' }, dependent: { kind: 'section', id: 'launch' } };
  const save = jest.fn().mockResolvedValue([link, hint]);
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage onSaveLink={save} />);
  const map = screen.getByRole('region', { name: 'Dependency map' });
  const dependencyTable = screen.getByRole('table', { name: 'Project dependencies' });
  expect(screen.getByRole('heading', { name: 'Dependency Graph' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Dependency Table' })).toBeInTheDocument();
  expect(map.compareDocumentPosition(dependencyTable) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /Remove dependency:/ })).toHaveLength(1);
  expect(dependencyTable).toContainElement(screen.getByRole('button', { name: /Remove dependency:/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Add dependency for Launch (section, Section)' }));
  fireEvent.click(within(map).getByRole('button', { name: 'Select prerequisite: Get approval (task, Prepare)' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('add', hint));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Launch depends on Get approval. Saved.'));
  expect(screen.getByRole('region', { name: 'Dependency map' }).querySelectorAll('foreignObject')).toHaveLength(3);
});

it('shows the dependent highlighted in both map and table during selection', () => {
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage />);
  startDependency();
  expect(screen.getAllByRole('button', { name: 'Select prerequisite: Publish (task, Prepare)' })).toHaveLength(2);
  screen.getAllByRole('button', { name: 'Select prerequisite: Publish (task, Prepare)' }).forEach(node => {
    expect(node).toHaveAttribute('aria-pressed', 'true');
  });
});

it('adds a dependency directly from a row and lists prerequisites in that row only', async () => {
  const otherLink: PlanLink = { prerequisite: { kind: 'section', id: 'launch' }, dependent: link.dependent };
  const save = jest.fn().mockResolvedValue([link, otherLink]);
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage onSaveLink={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add dependency for Publish (task, Prepare)' }));
  expect(screen.getByText('Select what it depends on')).toHaveFocus();
  expect(screen.queryByText('Select task or section')).not.toBeInTheDocument();
  expect(table().getByRole('button', { name: 'Select prerequisite: Publish (task, Prepare)' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Select prerequisite: Launch (section, Section)' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('add', otherLink));
  const publishRow = table().getByRole('button', { name: 'Inspect: Publish (task, Prepare)' }).closest('tr')!;
  expect(within(publishRow).getByText('Get approval')).toBeInTheDocument();
  expect(within(publishRow).getByText('Launch')).toBeInTheDocument();
  expect(within(publishRow).getAllByRole('button', { name: /Remove dependency:/ })).toHaveLength(2);
  const approvalRow = table().getByRole('button', { name: 'Inspect: Get approval (task, Prepare)' }).closest('tr')!;
  expect(within(approvalRow).queryByRole('button', { name: /Remove dependency:/ })).not.toBeInTheDocument();
});

it('keeps deadline warnings collapsed until requested', () => {
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage />);
  const warning = screen.getByText(/Deadline conflict/);
  expect(warning.closest('details')).not.toHaveAttribute('open');
  expect(screen.getByText('Warning')).toHaveAttribute('title', warning.textContent);
});

it('removes an inline dependency without deleting or completing tasks', async () => {
  const save = jest.fn().mockResolvedValue([]);
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage onSaveLink={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove dependency: Publish depends on Get approval' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('remove', link));
  await waitFor(() => expect(screen.queryByRole('button', { name: /Remove dependency/ })).not.toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Inspect: Publish (task, Prepare)' })).toBeInTheDocument();
  expect(project.subprojects[0]!.tasks.every(task => !task.done)).toBe(true);
});

it.each(['dependent', 'prerequisite'])('lets users repair links with a deleted %s', async deleted => {
  const remaining = deleted === 'dependent' ? 'a' : 'b';
  const save = jest.fn().mockResolvedValue([]);
  const modified = { ...project, subprojects: [{ ...project.subprojects[0]!, tasks: project.subprojects[0]!.tasks.filter(task => task.id === remaining) }], planningLinks: [link] };
  render(<ProjectPlan project={modified} canManage onSaveLink={save} />);
  expect(screen.getByRole('alert')).toHaveTextContent('no longer exists');
  expect(screen.getAllByRole('button', { name: /^Add dependency for/ }).every(button => button.hasAttribute('disabled'))).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /Remove dependency:/ }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('remove', link));
  await waitFor(() => expect(screen.getAllByRole('button', { name: /^Add dependency for/ }).every(button => !button.hasAttribute('disabled'))).toBe(true));
});

it('explains how to start when there are no tasks or sections', () => {
  render(<ProjectPlan project={{ ...project, subprojects: [] }} canManage />);
  expect(screen.getByText('Add tasks or sections in Tasks to start planning.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Add dependency/ })).not.toBeInTheDocument();
});

it('reveals Add dependency when a graph node is clicked and saves its chosen prerequisite', async () => {
  const hint: PlanLink = { dependent: { kind: 'task', id: 'b' }, prerequisite: { kind: 'section', id: 'launch' } };
  const save = jest.fn().mockResolvedValue([link, hint]);
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage onSaveLink={save} />);
  const map = within(screen.getByRole('region', { name: 'Dependency map' }));
  const node = map.getByRole('button', { name: 'Inspect: Publish (task, Prepare)' });
  expect(screen.queryByRole('group', { name: 'Selected graph item' })).not.toBeInTheDocument();
  fireEvent.click(node);
  const actions = within(screen.getByRole('group', { name: 'Selected graph item' }));
  expect(actions.getByText('Publish')).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(actions.getByRole('button', { name: 'Add dependency' }));
  expect(screen.getByText('Select what it depends on')).toHaveFocus();
  expect(screen.queryByRole('group', { name: 'Selected graph item' })).not.toBeInTheDocument();
  fireEvent.click(table().getByRole('button', { name: 'Select prerequisite: Launch (section, Section)' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('add', hint));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Publish depends on Launch. Saved.'));
  await waitFor(() => expect(node).toHaveFocus());
});

it.each(['click', 'Enter', ' '])('selects an arrow with %s and removes it only after confirmation', async activation => {
  const save = jest.fn().mockResolvedValue([]);
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage onSaveLink={save} />);
  const arrow = within(screen.getByRole('region', { name: 'Dependency map' })).getByRole('button', { name: 'Dependency: Publish depends on Get approval' });
  if (activation === 'click') fireEvent.click(arrow);
  else fireEvent.keyDown(arrow, { key: activation });
  expect(arrow).toHaveAttribute('aria-pressed', 'true');
  expect(save).not.toHaveBeenCalled();
  const actions = within(screen.getByRole('group', { name: 'Selected graph item' }));
  expect(actions.getByText('Publish depends on Get approval')).toBeInTheDocument();
  fireEvent.click(actions.getByRole('button', { name: 'Remove dependency' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('remove', link));
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Dependency map' })).not.toBeInTheDocument());
  expect(screen.queryByRole('group', { name: 'Selected graph item' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Remove dependency:/ })).not.toBeInTheDocument();
  expect(screen.getByRole('table', { name: 'Project dependencies' })).toHaveFocus();
});

it('restores the arrow after a failed removal so it can be retried', async () => {
  const save = jest.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue([]);
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage onSaveLink={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Dependency: Publish depends on Get approval' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove dependency' }));
  expect(screen.queryByRole('button', { name: 'Dependency: Publish depends on Get approval' })).not.toBeInTheDocument();
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
  fireEvent.click(await screen.findByRole('button', { name: 'Dependency: Publish depends on Get approval' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove dependency' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Dependency removed. Saved.'));
});

it('dismisses graph actions with Escape and does not select arrows during prerequisite selection', () => {
  const save = jest.fn();
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage onSaveLink={save} />);
  const arrow = screen.getByRole('button', { name: 'Dependency: Publish depends on Get approval' });
  fireEvent.click(arrow);
  fireEvent.keyDown(screen.getByRole('region', { name: 'Release project plan' }), { key: 'Escape' });
  expect(screen.queryByRole('group', { name: 'Selected graph item' })).not.toBeInTheDocument();
  expect(arrow).toHaveFocus();
  startDependency();
  fireEvent.click(arrow);
  expect(screen.queryByRole('group', { name: 'Selected graph item' })).not.toBeInTheDocument();
  expect(screen.getByText('Select what it depends on')).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});

it('does not offer graph mutation actions in a read-only plan', () => {
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage={false} />);
  fireEvent.click(within(screen.getByRole('region', { name: 'Dependency map' })).getByRole('button', { name: 'Inspect: Publish (task, Prepare)' }));
  expect(screen.queryByRole('group', { name: 'Selected graph item' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Dependency: Publish depends on Get approval' })).not.toBeInTheDocument();
});

it('marks graph sections for double-border styling without applying it to task nodes', () => {
  const hint: PlanLink = { dependent: { kind: 'section', id: 'launch' }, prerequisite: { kind: 'task', id: 'a' } };
  render(<ProjectPlan project={{ ...project, planningLinks: [hint] }} canManage />);
  const map = within(screen.getByRole('region', { name: 'Dependency map' }));
  expect(map.getByRole('button', { name: 'Inspect: Launch (section, Section)' })).toHaveClass('section');
  expect(map.getByRole('button', { name: 'Inspect: Get approval (task, Prepare)' })).not.toHaveClass('section');
});

it('zooms with the wheel only inside the graph, prevents page scrolling, and clamps zoom', () => {
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage />);
  const map = screen.getByRole('region', { name: 'Dependency map' });
  const svg = map.querySelector('svg')!;
  const initialWidth = Number(svg.getAttribute('width'));
  const wheel = new WheelEvent('wheel', { deltaY: -100000, bubbles: true, cancelable: true });
  fireEvent(map, wheel);
  expect(wheel.defaultPrevented).toBe(true);
  expect(Number(svg.getAttribute('width'))).toBe(initialWidth * 2);
  fireEvent.wheel(map, { deltaY: -100000 });
  expect(Number(svg.getAttribute('width'))).toBe(initialWidth * 2);
  fireEvent.wheel(map, { deltaY: 100000 });
  expect(Number(svg.getAttribute('width'))).toBe(initialWidth * 0.5);
  fireEvent.wheel(screen.getByRole('table', { name: 'Project dependencies' }), { deltaY: -100 });
  expect(Number(svg.getAttribute('width'))).toBe(initialWidth * 0.5);
  expect(screen.queryByText('Reset zoom')).not.toBeInTheDocument();
});

it('expands the existing editor in the selected task row and persists edits without changing links', () => {
  const apply = jest.fn();
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage onApplyChange={apply} />);
  fireEvent.click(table().getByRole('button', { name: 'Inspect: Publish (task, Prepare)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  const editor = screen.getByRole('region', { name: 'Edit Publish' });
  expect(editor.closest('tr')?.previousElementSibling).toContainElement(table().getByRole('button', { name: 'Inspect: Publish (task, Prepare)' }));
  const title = within(editor).getByRole('textbox', { name: 'Task title' });
  expect(title).toHaveFocus();
  fireEvent.change(title, { target: { value: 'Ship release' } });
  expect(apply).toHaveBeenLastCalledWith({ subprojects: expect.any(Array) });
  const saved = apply.mock.calls.at(-1)![0];
  expect(saved.subprojects[0].tasks[1].text).toBe('Ship release');
  expect(saved.subprojects[0].tasks[1].dueDate).toBe('2026-11-01');
  expect(saved.planningLinks).toBeUndefined();
  expect(screen.getByRole('button', { name: 'Remove dependency: Ship release depends on Get approval' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Roadmap' })).not.toBeInTheDocument();
  fireEvent.click(within(editor).getByRole('button', { name: 'Done' }));
  expect(screen.queryByRole('region', { name: 'Edit Ship release' })).not.toBeInTheDocument();
});

it('offers only project members as owners when editing, never other contacts', () => {
  const members = { ...project, members: [{ userId: 'u1', name: 'Member Mia' }] };
  render(<ProjectPlan project={members} canManage onApplyChange={jest.fn()} />);
  fireEvent.click(table().getByRole('button', { name: 'Inspect: Publish (task, Prepare)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  const editor = screen.getByRole('region', { name: 'Edit Publish' });
  expect(within(editor).getByTitle('Member Mia')).toBeInTheDocument();
  expect(within(editor).queryByTitle('Outside Olly')).not.toBeInTheDocument();
});

it('shows forecast bars, dates and assignee photos with an estimated duration label', () => {
  const assigned = { ...project, subprojects: project.subprojects.map(section => ({
    ...section, tasks: section.tasks.map(task => ({ ...task, people: [{ name: 'Alex' }], effort: task.id === 'a' ? 2 : null })),
  })) };
  render(<ProjectRoadmap project={assigned} links={[link]}
    people={[{ id: 'person', name: 'Alex', status: 'linked', avatarUrl: 'https://example.com/alex.png' }]} />);
  const roadmap = within(screen.getByRole('region', { name: 'Roadmap' }));
  const approval = roadmap.getByRole('img', { name: /Get approval:.*2 days/ });
  const publish = roadmap.getByRole('img', { name: /Publish:.*1 days, estimated/ });
  expect(approval.parentElement).toHaveStyle({ left: '0%' });
  expect(within(approval).getByText('2d')).toBeInTheDocument();
  expect(parseFloat(publish.parentElement!.style.left)).toBeGreaterThan(0);
  expect(within(publish).getByText('~1d')).toBeInTheDocument();
  expect(within(publish.parentElement!).getByRole('img', { name: 'Alex' })).toHaveStyle({ backgroundImage: 'url("https://example.com/alex.png")' });
  expect(approval.closest('[aria-label^="Dependency chain"]')).toBe(publish.closest('[aria-label^="Dependency chain"]'));
  expect(roadmap.getAllByRole('group', { name: /Dependency chain/ })).toHaveLength(2);
  const label = within(publish.parentElement!).getByText('Publish');
  expect(label).toHaveClass('roadmapLabel');
  expect(publish.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const avatar = within(publish).getByRole('img', { name: 'Alex' });
  expect(avatar.parentElement).toHaveClass('assignees');
  expect(avatar.compareDocumentPosition(within(publish).getByText('~1d')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(roadmap.getByText(/Forecast from \d{4}-\d{2}-\d{2}/)).toBeInTheDocument();
});

it('scrolls to the expanded task on Edit, including when the editor is already open', () => {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  const scroll = jest.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  try {
    render(<ProjectPlan project={project} canManage onApplyChange={jest.fn()} />);
    fireEvent.click(table().getByRole('button', { name: 'Inspect: Publish (task, Prepare)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const editor = screen.getByRole('region', { name: 'Edit Publish' });
    expect(scroll).toHaveBeenCalledWith({ behavior: 'instant', block: 'start', inline: 'nearest' });
    expect(scroll.mock.instances[0]).toBe(editor.closest('tr')?.previousElementSibling);
    expect(within(editor).getByRole('textbox', { name: 'Task title' })).toHaveFocus();
    scroll.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.instances[0]).toBe(editor.closest('tr')?.previousElementSibling);
  } finally {
    if (original) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', original);
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  }
});

it('removes static graph instructions and provides a hover-only scroll graphic', () => {
  render(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage />);
  expect(screen.queryByText(/Dependencies do not block/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Arrows point/)).not.toBeInTheDocument();
  const hint = screen.getByText('Scroll to zoom').parentElement!;
  expect(hint).toHaveClass('zoomHint');
  expect(hint).toHaveAttribute('aria-hidden', 'true');
  expect(hint.querySelectorAll('.material-icons')).toHaveLength(2);
});

it('shows green completion icons after completed task names in graph and table, but not sections or open tasks', () => {
  const completedProject = {
    ...project, planningLinks: [link],
    subprojects: project.subprojects.map(section => ({
      ...section, tasks: section.tasks.map(task => ({ ...task, done: task.id === 'a' })),
    })),
  };
  const { rerender } = render(<ProjectPlan project={completedProject} canManage />);
  expect(screen.getAllByRole('img', { name: 'Completed task' })).toHaveLength(2);
  for (const scope of [table(), within(screen.getByRole('region', { name: 'Dependency map' }))]) {
    const completed = within(scope.getByRole('button', { name: 'Inspect: Get approval (task, Prepare)' }));
    const icon = completed.getByRole('img', { name: 'Completed task' });
    expect(icon).toHaveClass('completed');
    expect(completed.getByText('Get approval').compareDocumentPosition(icon) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(scope.getByRole('button', { name: 'Inspect: Publish (task, Prepare)' })).queryByRole('img')).not.toBeInTheDocument();
  }
  expect(within(table().getByRole('button', { name: 'Inspect: Prepare (section, Section)' })).queryByRole('img')).not.toBeInTheDocument();
  rerender(<ProjectPlan project={{ ...project, planningLinks: [link] }} canManage />);
  expect(screen.queryByRole('img', { name: 'Completed task' })).not.toBeInTheDocument();
});
