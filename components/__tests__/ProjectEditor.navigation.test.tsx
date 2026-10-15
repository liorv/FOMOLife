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
  const { container } = render(<ProjectEditor project={project} targetTaskId="target" />);

  const field = screen.getByLabelText(/Due date/);
  expect(field.closest('[data-task-id="target"]')).toBeInTheDocument();
  expect(container.querySelector('[data-task-id="other"] .inline-editor')).toBeNull();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const editor = within(field.closest('.inline-editor') as HTMLElement);
  expect(editor.getByTitle('Current user')).toBeInTheDocument();
  expect(editor.getByTitle('Project teammate')).toBeInTheDocument();
});

it('allows closing an expanded deep-linked task without reopening it on a save refresh', () => {
  const { rerender } = render(<ProjectEditor project={project} targetTaskId="target" />);
  expect(screen.getByLabelText(/Due date/)).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Escape' });
  rerender(<ProjectEditor project={{ ...project }} targetTaskId="target" />);
  expect(screen.queryByLabelText(/Due date/)).not.toBeInTheDocument();
});
