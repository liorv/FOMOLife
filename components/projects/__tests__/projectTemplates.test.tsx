import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ProjectItem } from '@myorg/types';
import ProjectsDashboard from '../ProjectsDashboard';
import { TemplateDialog } from '../ProjectTemplates';

const template: ProjectItem = {
  id: 'template', text: 'Launch workflow', color: '#7B1FA2', isTemplate: true,
  description: 'A reusable launch plan',
  subprojects: [{ id: 'sub', text: 'Prepare', tasks: [{ id: 'task', text: 'Write brief', done: false, favorite: false, dueDate: null, people: [] }] }],
};
const project: ProjectItem = { id: 'active', text: 'Active project', color: '#1976D2', subprojects: [] };

it('separates templates from active projects and shows reusable workflow cards', async () => {
  const onSelectProject = jest.fn();
  await act(async () => { render(<ProjectsDashboard projects={[project, template]} onSelectProject={onSelectProject} onUseTemplate={jest.fn()} />); });
  expect(screen.queryByText(template.text)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Templates \(1\)/ }));
  expect(screen.queryByText(project.text)).not.toBeInTheDocument();
  const library = screen.getByRole('region', { name: 'Project templates' });
  expect(within(library).getByText(template.text)).toBeInTheDocument();
  expect(within(library).getByText('1 subproject')).toBeInTheDocument();
  expect(within(library).getByText('1 task')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: `Edit template ${template.text}` }));
  expect(onSelectProject).toHaveBeenCalledWith(template.id);
});

it('makes the empty library and blank template creation accessible from an empty account', async () => {
  const onCreateTemplate = jest.fn().mockResolvedValue(undefined);
  render(<ProjectsDashboard onCreateTemplate={onCreateTemplate} />);
  fireEvent.click(screen.getByRole('button', { name: /Templates \(0\)/ }));
  expect(screen.getByText('Your best workflows belong here')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /New template/ }));
  const dialog = screen.getByRole('dialog', { name: 'Create a template' });
  const input = within(dialog).getByLabelText('Template name');
  expect(input).toHaveFocus();
  expect(within(dialog).getByRole('button', { name: 'Create template' })).toBeDisabled();
  fireEvent.change(input, { target: { value: '  Weekly review  ' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create template' }));
  await waitFor(() => expect(onCreateTemplate).toHaveBeenCalledWith('Weekly review'));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('creates a named project from a template without changing the source', async () => {
  const onUseTemplate = jest.fn().mockResolvedValue(undefined);
  render(<ProjectsDashboard projects={[template]} onUseTemplate={onUseTemplate} />);
  fireEvent.click(screen.getByRole('button', { name: /Templates \(1\)/ }));
  fireEvent.click(screen.getByRole('button', { name: `Use template ${template.text}` }));
  fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Autumn launch' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
  await waitFor(() => expect(onUseTemplate).toHaveBeenCalledWith(template.id, 'Autumn launch'));
});

it.each([false, true])('confirms conversion in either direction (isTemplate: %s)', async isTemplate => {
  const selected = { ...project, isTemplate };
  const onConvertTemplate = jest.fn().mockResolvedValue(undefined);
  render(<ProjectsDashboard projects={[selected]} selectedProjectId={selected.id} onConvertTemplate={onConvertTemplate} />);
  const label = isTemplate ? 'Convert to project' : 'Convert to template';
  fireEvent.click(screen.getByRole('button', { name: 'More project actions' }));
  fireEvent.click(screen.getByRole('button', { name: label }));
  expect(onConvertTemplate).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: label }));
  await waitFor(() => expect(onConvertTemplate).toHaveBeenCalledWith(selected.id, !isTemplate));
});

it('shows template context and use action in its editor without an archive action', async () => {
  await act(async () => { render(<ProjectsDashboard projects={[template]} selectedProjectId={template.id} onUseTemplate={jest.fn()} onArchiveProject={jest.fn()} />); });
  expect(screen.getByText(/Changes here apply to future projects/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Use template' })).toBeInTheDocument();
  expect(screen.queryByTitle('Mark project complete and archive it')).not.toBeInTheDocument();
});

it('keeps failed submissions open with the entered name and supports retry', async () => {
  const onConfirm = jest.fn().mockRejectedValueOnce(new Error('Unable to save')).mockResolvedValueOnce(undefined);
  const onClose = jest.fn();
  render(<TemplateDialog action={{ kind: 'create' }} onConfirm={onConfirm} onClose={onClose} />);
  fireEvent.change(screen.getByLabelText('Template name'), { target: { value: 'My workflow' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create template' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save');
  expect(screen.getByLabelText('Template name')).toHaveValue('My workflow');
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Create template' }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

it('prevents duplicate requests and closing while saving', async () => {
  let finish!: () => void;
  const onConfirm = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const onClose = jest.fn();
  render(<TemplateDialog action={{ kind: 'convert', project }} onConfirm={onConfirm} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Convert to template' }));
  expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Saving...' }), { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Saving...' }));
  expect(onClose).not.toHaveBeenCalled();
  expect(onConfirm).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('supports keyboard dismissal and keeps keyboard focus in the dialog', () => {
  const onClose = jest.fn();
  render(<TemplateDialog action={{ kind: 'create' }} onConfirm={jest.fn()} onClose={onClose} />);
  const input = screen.getByLabelText('Template name');
  const cancel = screen.getByRole('button', { name: 'Cancel' });
  fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
  expect(cancel).toHaveFocus();
  fireEvent.keyDown(cancel, { key: 'Tab' });
  expect(input).toHaveFocus();
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});
