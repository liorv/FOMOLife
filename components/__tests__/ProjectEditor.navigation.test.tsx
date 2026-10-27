import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ProjectItem } from '@myorg/types';
import ProjectEditor from '../projects/ProjectEditor';

const project: ProjectItem = {
  id: 'project',
  text: 'Project',
  color: '#1976D2',
  members: [
    { userId: 'self', name: 'Current user' },
    { userId: 'teammate', name: 'Project teammate', avatarUrl: '/teammate.png' },
  ],
  subprojects: [{
    id: 'subproject',
    text: 'Collapsed section',
    collapsed: true,
    tasks: [{
      id: 'target',
      text: 'Target task',
      done: false,
      favorite: false,
      dueDate: '2026-10-20',
      people: [],
    }, {
      id: 'other',
      text: 'Other task',
      done: false,
      favorite: false,
      dueDate: null,
      people: [],
    }],
  }],
};

it('expands a deep-linked task inside its previously collapsed project section', () => {
  render(<ProjectEditor project={project} targetTaskId="target" />);

  const dialog = screen.getByRole('dialog', { name: 'Edit task' });
  const editor = within(dialog);
  expect(editor.getByLabelText(/Due date/)).toBeInTheDocument();
  expect(editor.getByTitle('Current user')).toBeInTheDocument();
  expect(editor.getByTitle('Project teammate')).toBeInTheDocument();
});

it('allows closing an expanded deep-linked task without reopening it on a save refresh', () => {
  const { rerender } = render(<ProjectEditor project={project} targetTaskId="target" />);
  expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Escape' });
  rerender(<ProjectEditor project={{ ...project }} targetTaskId="target" />);
  expect(screen.queryByRole('dialog', { name: 'Edit task' })).not.toBeInTheDocument();
});

it('expands and highlights a located task without opening its editor', () => {
  render(<ProjectEditor project={project} targetTaskId="target" locateTaskOnly />);
  expect(document.querySelector('[data-task-id="target"]')).toHaveClass('task-navigation-highlight');
  expect(screen.queryByRole('dialog', { name: 'Edit task' })).not.toBeInTheDocument();
});

it('confirms task deletion when dependencies reference it and removes those links together', () => {
  const onApplyChange = jest.fn();
  const linkedProject = {
    ...project,
    subprojects: project.subprojects.map(section => ({ ...section, collapsed: false })),
    planningLinks: [
      { prerequisite: { kind: 'task' as const, id: 'target' }, dependent: { kind: 'task' as const, id: 'other' } },
      { prerequisite: { kind: 'task' as const, id: 'other' }, dependent: { kind: 'task' as const, id: 'target' } },
    ],
  };
  render(<ProjectEditor project={linkedProject} onApplyChange={onApplyChange} />);
  const taskRow = document.querySelector('[data-task-id="target"]') as HTMLElement;

  fireEvent.click(within(taskRow).getByRole('button', { name: 'Delete' }));
  const dialog = screen.getByRole('dialog', { name: 'Remove task and dependencies?' });
  const dependencyRows = within(dialog).getAllByRole('listitem');
  expect(dependencyRows[0]).toHaveTextContent('Other task depends on Target task');
  expect(dependencyRows[1]).toHaveTextContent('Target task depends on Other task');

  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(document.querySelector('[data-task-id="target"]')).toBeInTheDocument();
  expect(onApplyChange).not.toHaveBeenCalled();

  fireEvent.click(within(taskRow).getByRole('button', { name: 'Delete' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove task and links' }));
  expect(onApplyChange).toHaveBeenLastCalledWith(expect.objectContaining({
    planningLinks: [],
    subprojects: [expect.objectContaining({
      tasks: [expect.objectContaining({ id: 'other' })],
    })],
  }));
});
