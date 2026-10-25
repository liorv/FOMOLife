import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ProjectItem, ProjectRisk } from '@myorg/types';
import ProjectRisks from '../ProjectRisks';

const risk: ProjectRisk = {
  id: 'risk', name: 'Vendor delay', description: 'Delivery could slip', mitigations: [],
};
const project: ProjectItem = {
  id: 'p', text: 'Launch', color: '#1976D2',
  subprojects: [{
    id: 's', text: 'Preparation', tasks: [
      { id: 'a', text: 'Order parts', done: false, favorite: false, dueDate: null, people: [], description: 'Keep notes', risks: [risk] },
      { id: 'b', text: 'Ship', done: true, favorite: true, dueDate: '2026-12-01', people: [] },
    ],
  }],
};

function setup(initial = project) {
  const change = jest.fn();
  render(<ProjectRisks project={initial} canManage onApplyChange={change} />);
  const savedTask = () => {
    const update: Partial<ProjectItem> = change.mock.calls.at(-1)![0];
    return update.subprojects![0]!.tasks[0]!;
  };
  return { change, savedTask };
}

it('uses the dependency section/task layout and only adds risks to tasks', () => {
  setup();
  const table = within(screen.getByRole('table', { name: 'Risk Management' }));
  expect(table.getByText('Preparation')).toBeInTheDocument();
  expect(table.getByRole('button', { name: 'Order parts' })).toBeInTheDocument();
  expect(table.getAllByRole('button', { name: /^Add risk for/ })).toHaveLength(2);
  expect(table.queryByRole('button', { name: /^Add risk for Preparation/ })).not.toBeInTheDocument();
  expect(table.getByLabelText('Completed')).toBeInTheDocument();
  expect(table.getByText('Unmitigated', { exact: true })).toBeInTheDocument();
});

it('adds multiple risks without changing task metadata or other tasks', () => {
  const { savedTask, change } = setup();
  fireEvent.click(screen.getByRole('button', { name: /^Add risk for Order parts/ }));
  expect(screen.getByLabelText('Risk name')).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Save risk' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Risk name'), { target: { value: '  Missing approval  ' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: '  Sign-off may slip  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save risk' }));
  expect(savedTask()).toMatchObject({ ...project.subprojects[0]!.tasks[0], risks: [
    risk, { id: expect.any(String), name: 'Missing approval', description: 'Sign-off may slip', mitigations: [] },
  ] });
  expect(change.mock.calls.at(-1)![0].subprojects[0].tasks[1]).toEqual(project.subprojects[0]!.tasks[1]);
  expect(screen.getAllByText('Unmitigated', { exact: true })).toHaveLength(2);
});

it('adds, edits, and removes mitigations and derives status from the saved list', () => {
  const { savedTask } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Edit risk Vendor delay' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add mitigation' }));
  expect(screen.getByRole('button', { name: 'Save risk' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Mitigation 1'), { target: { value: '  Backup supplier  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add mitigation' }));
  fireEvent.change(screen.getByLabelText('Mitigation 2'), { target: { value: 'Order early' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save risk' }));
  expect(screen.getByText('Mitigated', { exact: true })).toBeInTheDocument();
  expect(savedTask().risks![0]!.mitigations.map(item => item.text)).toEqual(['Backup supplier', 'Order early']);
  const mitigationId = savedTask().risks![0]!.mitigations[0]!.id;
  fireEvent.click(screen.getByRole('button', { name: 'Edit risk Vendor delay' }));
  fireEvent.change(screen.getByLabelText('Risk name'), { target: { value: 'Delivery delay' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New description' } });
  fireEvent.change(screen.getByLabelText('Mitigation 1'), { target: { value: 'Confirmed backup' } });
  fireEvent.click(screen.getByRole('button', { name: 'Remove mitigation 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save risk' }));
  expect(savedTask().risks![0]).toEqual({
    id: risk.id, name: 'Delivery delay', description: 'New description',
    mitigations: [{ id: mitigationId, text: 'Confirmed backup' }],
  });
  fireEvent.click(screen.getByRole('button', { name: 'Edit risk Delivery delay' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove mitigation 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save risk' }));
  expect(savedTask().risks![0]!.mitigations).toEqual([]);
  expect(screen.getByText('Unmitigated', { exact: true })).toBeInTheDocument();
  expect(screen.queryByText('Mitigated', { exact: true })).not.toBeInTheDocument();
});

it('cancels additions and edits without saving and removes a risk independently', () => {
  const { change, savedTask } = setup();
  fireEvent.click(screen.getByRole('button', { name: /^Add risk for Order parts/ }));
  fireEvent.change(screen.getByLabelText('Risk name'), { target: { value: 'Draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit risk Vendor delay' }));
  fireEvent.change(screen.getByLabelText('Risk name'), { target: { value: 'Discarded' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add mitigation' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByText('Vendor delay')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove risk Vendor delay' }));
  expect(savedTask().risks).toEqual([]);
  expect(screen.queryByText('Vendor delay')).not.toBeInTheDocument();
});

it('disables whitespace-only names and mitigations', () => {
  const { change } = setup();
  fireEvent.click(screen.getByRole('button', { name: /^Add risk for Ship/ }));
  fireEvent.change(screen.getByLabelText('Risk name'), { target: { value: '   ' } });
  expect(screen.getByRole('button', { name: 'Save risk' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Risk name'), { target: { value: 'Damage' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add mitigation' }));
  fireEvent.change(screen.getByLabelText('Mitigation 1'), { target: { value: '   ' } });
  expect(screen.getByRole('button', { name: 'Save risk' })).toBeDisabled();
  expect(change).not.toHaveBeenCalled();
});

it('shows saved risks read-only and synchronizes incoming task data', () => {
  const { rerender } = render(<ProjectRisks project={project} canManage={false} />);
  expect(screen.getByText('Vendor delay')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  const updated = { ...project, subprojects: [{
    ...project.subprojects[0]!, tasks: [{ ...project.subprojects[0]!.tasks[0]!, risks: [{
      ...risk, mitigations: [{ id: 'm', text: 'Reserve stock' }],
    }] }],
  }] };
  rerender(<ProjectRisks project={updated} canManage={false} />);
  expect(screen.getByText('Reserve stock')).toBeInTheDocument();
  expect(screen.getByText('Mitigated', { exact: true })).toBeInTheDocument();
});

it('shows an empty state for projects without sections', () => {
  setup({ ...project, subprojects: [] });
  expect(screen.getByText('Add tasks or sections in Tasks to start managing risks.')).toBeInTheDocument();
});
