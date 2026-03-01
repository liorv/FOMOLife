import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import ProjectEditor from '../ProjectEditor';
import type { ProjectItem, ProjectSubproject, ProjectTask } from '@myorg/types';

// minimal project with one subproject and one task
const baseTask: ProjectTask = {
  id: 't1',
  text: 'Original task',
  description: 'orig',
  done: false,
  dueDate: null,
  favorite: false,
  people: [],
};

const baseSub: ProjectSubproject = {
  id: 'sp1',
  text: 'Subproject',
  tasks: [baseTask],
  collapsed: false,
};

const baseProject: ProjectItem = {
  id: 'p1',
  text: 'My project',
  color: '#fff',
  subprojects: [baseSub],
};

describe('ProjectEditor behaviour', () => {
  let applied: Partial<ProjectItem>[];
  let editingId: string | null;

  beforeEach(() => {
    applied = [];
    editingId = baseProject.id;
  });

  const renderEditor = (canManage = true) =>
    render(
      <ProjectEditor
        project={baseProject}
        editingProjectId={editingId}
        setEditorTaskId={() => {}}
        editorTaskId={null}
        onApplyChange={((updated: Partial<ProjectItem>) => {
          applied.push(updated);
          Object.assign(baseProject, updated);
        }) as any}
        canManage={canManage}
        onDelete={() => {}}
        onUpdateText={() => {}}
        onUpdateColor={() => {}}
        onToggleCollapse={() => {}}
        onAddTask={() => {}}
        handleTaskToggle={() => {}}
        handleTaskStar={() => {}}
        handleTaskDelete={() => {}}
        onOpenPeople={() => {}}
        onCreatePerson={async () => null}
      />
    );

  it('persists a task edit via onApplyChange', async () => {
    renderEditor();

    // open the full editor by clicking the expand icon
    const expandIcon = screen.getByTitle(/expand editor/i);
    fireEvent.click(expandIcon);
    const desc = await screen.findByLabelText(/notes/i);
    fireEvent.change(desc, { target: { value: 'changed' } });

    await waitFor(() => {
      expect(applied.length).toBeGreaterThan(0);
      const last = applied[applied.length - 1]!; // length>0 guaranteed above
      expect(last.subprojects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            tasks: expect.arrayContaining([
              expect.objectContaining({ description: 'changed' }),
            ]),
          }),
        ]),
      );
    });
  });

  it('does nothing when canManage is false', async () => {
    applied = [];
    editingId = baseProject.id;

    renderEditor(false);

    const expandIcon = screen.getByTitle(/expand editor/i);
    fireEvent.click(expandIcon);
    const desc = await screen.findByLabelText(/notes/i);
    fireEvent.change(desc, { target: { value: "won't save" } });

    await new Promise((r) => setTimeout(r, 50));
    expect(applied).toHaveLength(0);
  });
});
