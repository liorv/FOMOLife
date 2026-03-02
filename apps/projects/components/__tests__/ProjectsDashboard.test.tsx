/// <reference types="jest" />
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import ProjectsDashboard from '../ProjectsDashboard';
import type { ProjectItem } from '@myorg/types';

// common props with minimal implementations
const baseProps = {
  projects: [] as ProjectItem[],
  people: [] as any[],
  selectedProjectId: null as string | null,
  onSelectProject: jest.fn(),
  onApplyChange: jest.fn(),
  onAddSubproject: jest.fn(),
  newlyAddedSubprojectId: null,
  onClearNewSubproject: jest.fn(),
  onSubprojectDeleted: jest.fn(),
  onColorChange: jest.fn(),
  onReorder: jest.fn(),
  onDeleteProject: jest.fn(),
  onAddProject: jest.fn(),
  onOpenPeople: jest.fn(),
  onCreatePerson: jest.fn(),
  onTitleChange: jest.fn(),
  projectSearch: '',
  filters: [] as string[],
  onToggleFilter: jest.fn(),
};

describe('ProjectsDashboard thumb integration', () => {
  it('replies to get-thumb-config and responds to fab', async () => {
    const { rerender } = render(<ProjectsDashboard {...baseProps} />);

    const msgs: any[] = [];
    window.addEventListener('message', (e) => msgs.push(e.data));

    act(() => {
      window.postMessage({ type: 'get-thumb-config' }, '*');
    });
    await waitFor(() => msgs.some((m) => m.type === 'thumb-config'));
    let cfg = msgs.find((m) => m.type === 'thumb-config');
    expect(cfg?.icon).toBe('/assets/add-project.svg');
    expect(cfg?.action).toBe('add-project');

    // selecting a project should change both icon and action
    rerender(<ProjectsDashboard {...baseProps} selectedProjectId="foo" />);
    act(() => {
      window.postMessage({ type: 'get-thumb-config' }, '*');
    });
    await waitFor(() => msgs.filter((m) => m.type === 'thumb-config').length >= 3);
    cfg = msgs.filter((m) => m.type === 'thumb-config')[2];
    expect(cfg.icon).toBe('/assets/add-sub-project.svg');
    expect(cfg.action).toBe('add-subproject');

    // simulate press with project selected; should call onAddSubproject
    act(() => {
      window.postMessage({ type: 'add-subproject' }, '*');
    });
    await waitFor(() => expect(baseProps.onAddSubproject).toHaveBeenCalledWith('foo', ''));

    // also handle the legacy thumb-fab event when a project is selected
    baseProps.onAddSubproject.mockClear();
    act(() => {
      window.postMessage({ type: 'thumb-fab' }, '*');
    });
    await waitFor(() => expect(baseProps.onAddSubproject).toHaveBeenCalledWith('foo', ''));
  });
});