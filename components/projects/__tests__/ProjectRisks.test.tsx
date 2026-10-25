import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ProjectItem, ProjectRisk } from '@myorg/types';
import ProjectRisks from '../ProjectRisks';

const risk: ProjectRisk = { id: 'r', name: 'Vendor delay', description: 'Delivery could slip', mitigations: [] };
const project: ProjectItem = {
  id: 'p', text: 'Launch', color: '#1976D2',
  subprojects: [{ id: 's', text: 'Preparation', tasks: [
    { id: 'a', text: 'Order parts', description: 'Notes', done: false, favorite: false, dueDate: null, people: [], risks: [risk] },
    { id: 'b', text: 'Ship', done: true, favorite: true, dueDate: null, people: [] },
  ] }],
};

function setup(risks: ProjectRisk[] = [risk]) {
  const change = jest.fn();
  const initial = { ...project, subprojects: [{ ...project.subprojects[0]!, tasks: [
    { ...project.subprojects[0]!.tasks[0]!, risks }, project.subprojects[0]!.tasks[1]!,
  ] }] };
  const rendered = render(<ProjectRisks project={initial} canManage onApplyChange={change} />);
  return {
    ...rendered, change,
    savedTask: () => (change.mock.calls.at(-1)![0] as Partial<ProjectItem>).subprojects![0]!.tasks[0]!,
  };
}

function select() {
  fireEvent.click(screen.getByRole('row', { name: 'Select row: Order parts / Vendor delay' }));
}

function addRisk(name: string) {
  const input = screen.getByRole('textbox', { name: 'New risk for Order parts' });
  fireEvent.change(input, { target: { value: name } });
  fireEvent.submit(input.closest('form')!);
}

function addMitigation(text: string) {
  const input = screen.getByRole('textbox', { name: 'New mitigation for Vendor delay' });
  fireEvent.change(input, { target: { value: text } });
  fireEvent.submit(input.closest('form')!);
}

it.each([true, false])('places the shared completion check before task names (canManage=%s)', canManage => {
  const completedProject = { ...project, subprojects: project.subprojects.map(section => ({
    ...section, tasks: section.tasks.map(task => ({ ...task, done: true })),
  })) };
  render(<ProjectRisks project={completedProject} canManage={canManage} />);
  const table = within(screen.getByRole('table', { name: 'Risk Management' }));
  expect(table.getAllByRole('img', { name: 'Completed task' })).toHaveLength(2);
  for (const name of ['Order parts', 'Ship']) {
    const text = table.getByText(name);
    const icon = within(text.parentElement!).getByRole('img', { name: 'Completed task' });
    expect(icon.tagName.toLowerCase()).toBe('svg');
    expect(icon).toHaveClass('completed');
    expect(icon.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
  expect(within(table.getByText('Preparation').parentElement!).queryByRole('img')).not.toBeInTheDocument();
});

it('filters individual risks while retaining matching task and section context', () => {
  const { change } = setup([risk, { ...risk, id: 'r2', name: 'Damage', mitigations: [{ id: 'm', text: 'Protective packaging' }] }]);
  const filter = screen.getByRole('group', { name: 'Filter risks' });
  expect(within(filter).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  expect(within(filter).getAllByRole('button').map(button => button.textContent)).toEqual(['All', 'Mitigated', 'Unmitigated']);
  fireEvent.click(within(filter).getByRole('button', { name: 'Mitigated' }));
  expect(within(filter).getByRole('button', { name: 'Mitigated' })).toHaveAttribute('aria-pressed', 'true');
  expect(within(filter).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('Damage')).toBeInTheDocument();
  expect(screen.getByText('Protective packaging')).toBeInTheDocument();
  expect(screen.queryByText('Vendor delay')).not.toBeInTheDocument();
  expect(screen.queryByText('Ship')).not.toBeInTheDocument();
  expect(screen.getByText('Preparation')).toBeInTheDocument();
  expect(screen.getByRole('rowheader', { name: 'Order parts' })).toHaveAttribute('rowspan', '1');
  fireEvent.click(within(filter).getByRole('button', { name: 'Unmitigated' }));
  expect(screen.getByText('Vendor delay')).toBeInTheDocument();
  expect(screen.queryByText('Damage')).not.toBeInTheDocument();
  expect(screen.queryByText('Protective packaging')).not.toBeInTheDocument();
  fireEvent.click(within(filter).getByRole('button', { name: 'All' }));
  expect(screen.getByText('Damage')).toBeInTheDocument();
  expect(screen.getByText('Vendor delay')).toBeInTheDocument();
  expect(screen.getByText('Ship')).toBeInTheDocument();
  expect(change).not.toHaveBeenCalled();
});

it('shows an empty state and hides sections without matching risks', () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'Mitigated' }));
  expect(screen.getByText('No risks match this filter.')).toBeInTheDocument();
  expect(screen.queryByText('Preparation')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'All' }));
  expect(screen.getByText('Vendor delay')).toBeInTheDocument();
});

it('discards inline drafts and selection when the filter changes', () => {
  const { change } = setup();
  select();
  fireEvent.change(screen.getByRole('textbox', { name: 'New risk for Order parts' }), { target: { value: 'Discard' } });
  fireEvent.click(screen.getByRole('button', { name: 'Unmitigated' }));
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  select();
  expect(screen.getByRole('textbox', { name: 'New risk for Order parts' })).toHaveValue('');
  expect(change).not.toHaveBeenCalled();
});

it('reapplies the filter after mitigation changes without losing hidden risks', () => {
  const { savedTask } = setup();
  const filter = screen.getByRole('group', { name: 'Filter risks' });
  fireEvent.click(within(filter).getByRole('button', { name: 'Unmitigated' }));
  select();
  addMitigation('Backup supplier');
  expect(screen.getByText('No risks match this filter.')).toBeInTheDocument();
  expect(savedTask().risks![0]!.mitigations).toEqual([{ id: expect.any(String), text: 'Backup supplier' }]);
  fireEvent.click(within(filter).getByRole('button', { name: 'Mitigated' }));
  select();
  fireEvent.click(screen.getByRole('button', { name: 'Remove mitigation: Backup supplier (Vendor delay)' }));
  expect(screen.getByText('No risks match this filter.')).toBeInTheDocument();
  expect(savedTask().risks).toEqual([risk]);
  fireEvent.click(within(filter).getByRole('button', { name: 'All' }));
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByText('Vendor delay')).toBeInTheDocument();
});

it('allows filtering in read-only projects without exposing editing controls', () => {
  render(<ProjectRisks project={project} canManage={false} />);
  const filter = screen.getByRole('group', { name: 'Filter risks' });
  fireEvent.click(within(filter).getByRole('button', { name: 'Unmitigated' }));
  expect(screen.getByText('Vendor delay')).toBeInTheDocument();
  expect(screen.queryByText('Ship')).not.toBeInTheDocument();
  expect(within(screen.getByRole('table', { name: 'Risk Management' })).queryByRole('button')).not.toBeInTheDocument();
});

it('keeps unselected rows plain and shows text entry fields only after selection', () => {
  setup();
  const table = screen.getByRole('table', { name: 'Risk Management' });
  expect(within(table).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Task / Section', 'Risks', 'Mitigations']);
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /risk|mitigation/i })).not.toBeInTheDocument();
  select();
  expect(screen.getByRole('textbox', { name: 'New risk for Order parts' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'New mitigation for Vendor delay' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Add risk|Add mitigation/ })).not.toBeInTheDocument();
});

it('adds a trimmed risk with Enter submission without changing other task data', () => {
  const { savedTask, change } = setup();
  select();
  addRisk('  Approval delay  ');
  expect(savedTask()).toMatchObject({ ...project.subprojects[0]!.tasks[0], risks: [
    risk, { id: expect.any(String), name: 'Approval delay', description: '', mitigations: [] },
  ] });
  expect(change.mock.calls.at(-1)![0].subprojects[0].tasks[1]).toEqual(project.subprojects[0]!.tasks[1]);
  expect(screen.getByRole('textbox', { name: 'New risk for Order parts' })).toHaveValue('');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('puts a single risk field below the last risk even when an earlier row is selected', () => {
  setup([risk, { ...risk, id: 'r2', name: 'Damage' }]);
  select();
  const input = screen.getByRole('textbox', { name: 'New risk for Order parts' });
  const lastRiskRow = screen.getByText('Damage').closest('tr')!;
  const inputRow = screen.getByRole('row', { name: 'New risk row for Order parts' });
  expect(lastRiskRow).not.toContainElement(input);
  expect(lastRiskRow.nextElementSibling).toBe(inputRow);
  expect(inputRow).toContainElement(input);
  expect(inputRow).toHaveClass('addRiskRow');
  expect(input.closest('td')).not.toHaveClass('riskUnmitigated');
  expect(input.closest('td')).not.toHaveClass('riskMitigated');
  expect(screen.getByRole('rowheader', { name: 'Order parts' })).toHaveAttribute('rowspan', '3');
  fireEvent.click(input);
  fireEvent.change(input, { target: { value: 'New risk' } });
  fireEvent.submit(input.closest('form')!);
  expect(screen.getByText('New risk')).toBeInTheDocument();
  expect(screen.getAllByRole('textbox', { name: 'New risk for Order parts' })).toHaveLength(1);
});

it('adds risks to tasks with no risks using keyboard selection', () => {
  setup();
  const row = screen.getByRole('row', { name: 'Select row: Ship' });
  fireEvent.keyDown(row, { key: 'Enter' });
  const input = screen.getByRole('textbox', { name: 'New risk for Ship' });
  expect(row).toContainElement(input);
  expect(within(row).queryByText('No Risks')).not.toBeInTheDocument();
  expect(screen.queryByRole('row', { name: 'New risk row for Ship' })).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'Shipping damage' } });
  fireEvent.submit(input.closest('form')!);
  expect(screen.getByText('Shipping damage')).toBeInTheDocument();
});

it('uses question prompts for risk and mitigation entry', () => {
  setup();
  select();
  expect(screen.getByRole('textbox', { name: 'New risk for Order parts' })).toHaveAttribute('placeholder', 'What is the risk?');
  expect(screen.getByRole('textbox', { name: 'New mitigation for Vendor delay' })).toHaveAttribute('placeholder', 'How will we mitigate the risk?');
});

it('cancels new risk and mitigation text on blur or Escape without saving', () => {
  const { change } = setup();
  select();
  const name = screen.getByRole('textbox', { name: 'New risk for Order parts' });
  fireEvent.change(name, { target: { value: 'Discard' } });
  fireEvent.blur(name);
  expect(name).toHaveValue('');
  fireEvent.change(name, { target: { value: 'Discard again' } });
  name.focus();
  fireEvent.keyDown(name, { key: 'Escape' });
  expect(name).toHaveValue('');
  const mitigation = screen.getByRole('textbox', { name: 'New mitigation for Vendor delay' });
  fireEvent.change(mitigation, { target: { value: 'Discard bullet' } });
  fireEvent.blur(mitigation);
  expect(mitigation).toHaveValue('');
  expect(change).not.toHaveBeenCalled();
});

it('appends multiple trimmed mitigation bullets and updates status and background', () => {
  const { savedTask } = setup();
  expect(screen.getByText('Vendor delay').closest('td')).toHaveClass('riskUnmitigated');
  select();
  addMitigation('  Backup supplier  ');
  addMitigation('Order early');
  expect(savedTask().risks![0]!.mitigations.map(item => item.text)).toEqual(['Backup supplier', 'Order early']);
  expect(within(screen.getByRole('table', { name: 'Risk Management' })).getByText('Mitigated', { exact: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit risk Vendor delay' }).closest('td')).toHaveClass('riskMitigated');
  expect(screen.getByRole('textbox', { name: 'New mitigation for Vendor delay' })).toHaveValue('');
});

it('reports blank quick-add submissions without saving', () => {
  const { change } = setup();
  select();
  addRisk('   ');
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a risk name');
  addMitigation('   ');
  expect(screen.getByRole('alert')).toHaveTextContent('Enter mitigation text');
  expect(change).not.toHaveBeenCalled();
});

it('edits existing mitigation tags inline without changing identities', () => {
  const { savedTask } = setup([{ ...risk, mitigations: [{ id: 'm', text: 'Backup' }] }]);
  select();
  fireEvent.click(screen.getByRole('button', { name: 'Edit mitigation: Backup (Vendor delay)' }));
  const input = screen.getByRole('textbox', { name: 'Edit mitigation for Vendor delay' });
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: 'Confirmed backup' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save mitigation' }));
  expect(savedTask().risks![0]!.mitigations).toEqual([{ id: 'm', text: 'Confirmed backup' }]);
});

it('removes the last mitigation with X and restores red unmitigated highlighting', () => {
  const { savedTask } = setup([{ ...risk, mitigations: [{ id: 'm', text: 'Backup' }] }]);
  expect(screen.getByText('Vendor delay').closest('td')).toHaveClass('riskMitigated');
  select();
  fireEvent.click(screen.getByRole('button', { name: 'Remove mitigation: Backup (Vendor delay)' }));
  expect(savedTask().risks![0]!.mitigations).toEqual([]);
  expect(within(screen.getByRole('table', { name: 'Risk Management' })).getByText('Unmitigated', { exact: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit risk Vendor delay' }).closest('td')).toHaveClass('riskUnmitigated');
});

it('keeps the existing risk modal editable and preserves selection when closing it', () => {
  const { savedTask } = setup();
  select();
  fireEvent.click(screen.getByRole('button', { name: 'Edit risk Vendor delay' }));
  expect(screen.getByRole('dialog', { name: 'Edit risk for Order parts' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated description' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save risk' }));
  expect(savedTask().risks![0]!.description).toBe('Updated description');
  expect(screen.getByRole('textbox', { name: 'New risk for Order parts' })).toBeInTheDocument();
});

it('removes risks through selected tags', () => {
  const { savedTask } = setup();
  select();
  fireEvent.click(screen.getByRole('button', { name: 'Remove risk Vendor delay' }));
  expect(savedTask().risks).toEqual([]);
  expect(screen.getByRole('textbox', { name: 'New risk for Order parts' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('heading', { name: 'Risk Management' }));
  expect(within(screen.getByRole('row', { name: 'Select row: Order parts' })).getByText('No Risks')).toBeInTheDocument();
});

it('returns to plain text on outside click without saving drafts', () => {
  const { change } = setup();
  select();
  fireEvent.change(screen.getByRole('textbox', { name: 'New risk for Order parts' }), { target: { value: 'Discard' } });
  fireEvent.click(screen.getByRole('heading', { name: 'Risk Management' }));
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /risk|mitigation/i })).not.toBeInTheDocument();
  expect(change).not.toHaveBeenCalled();
});

it('task-name clicks open only the task editor', () => {
  setup();
  select();
  fireEvent.click(screen.getByRole('button', { name: 'Order parts' }));
  expect(screen.getByRole('region', { name: 'Edit Order parts' })).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'New risk for Order parts' })).not.toBeInTheDocument();
});

it('shows descriptions after exactly two seconds and cancels on leaving', () => {
  jest.useFakeTimers();
  try {
    setup();
    const name = screen.getByText('Vendor delay');
    fireEvent.mouseEnter(name);
    act(() => jest.advanceTimersByTime(1999));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByRole('tooltip')).toHaveTextContent(risk.description);
    fireEvent.mouseLeave(name);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});

it('supports read-only risks and incoming changes', () => {
  const { rerender } = render(<ProjectRisks project={project} canManage={false} />);
  expect(within(screen.getByRole('table', { name: 'Risk Management' })).queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  rerender(<ProjectRisks canManage={false} project={{ ...project, subprojects: [{
    ...project.subprojects[0]!, tasks: [{ ...project.subprojects[0]!.tasks[0]!, risks: [
      { ...risk, mitigations: [{ id: 'm', text: 'Reserve stock' }] },
    ] }],
  }] }} />);
  expect(screen.getByText('Reserve stock')).toBeInTheDocument();
  expect(screen.getByText('Vendor delay').closest('td')).toHaveClass('riskMitigated');
});

it('shows an empty state for projects without sections', () => {
  render(<ProjectRisks project={{ ...project, subprojects: [] }} canManage />);
  expect(screen.getByText('Add tasks or sections in Tasks to start managing risks.')).toBeInTheDocument();
});
