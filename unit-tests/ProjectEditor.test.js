import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectEditor from '../src/components/ProjectEditor';

// mock helpers used by ProjectEditor
const defaultProps = {
  project: {
    id: 'proj1',
    text: 'Test project',
    subprojects: [],
  },
  onApplyChange: jest.fn(),
  allPeople: [],
  onCreatePerson: jest.fn(),
  onOpenPeople: jest.fn(),
  onAddSubproject: jest.fn(),
  onBack: jest.fn(),
};

describe('ProjectEditor', () => {
  test('fab button shows and hides a menu when clicked', () => {
    render(<ProjectEditor {...defaultProps} />);

    const fab = screen.getByTitle('Add subproject');
    expect(fab).toBeInTheDocument();

    // menu should not exist initially
    expect(screen.queryByRole('menu')).toBeNull();

    // open the menu
    fireEvent.click(fab);

    const menu = document.querySelector('.fab-menu');
    expect(menu).toBeTruthy();

    // the menu container is rendered and uses the CSS class (z-index is managed
    // in the stylesheet rather than inline, so jsdom won't provide a value here)
    expect(menu.classList.contains('fab-menu')).toBe(true);

    // the two submenu buttons should be present
    const aiBtn = screen.getByTitle('AI assisted subproject');
    const manualBtn = screen.getByTitle('Add manual subproject');
    expect(aiBtn).toBeInTheDocument();
    expect(manualBtn).toBeInTheDocument();
    // labels should be visible
    expect(aiBtn.textContent).toContain('AI assisted project design');
    expect(manualBtn.textContent).toContain('Add subproject');
    // ensure they are not fixed-position (so they flow above the main FAB)
    expect(window.getComputedStyle(aiBtn).position).not.toBe('fixed');
    expect(window.getComputedStyle(manualBtn).position).not.toBe('fixed');
    // clicking again should close it
    fireEvent.click(fab);
    expect(document.querySelector('.fab-menu')).toBeNull();
  });

  test('generated inputs include unique id attributes for accessibility', () => {
    const props = {
      ...defaultProps,
      project: {
        ...defaultProps.project,
        subprojects: [
          { id: 'sub1', text: 'foo', newTaskText: '' },
        ],
      },
    };
    render(<ProjectEditor {...props} />);
    // the subproject name input should have an id based on the subproject id
    const nameInput = document.getElementById('subproject-name-sub1');
    expect(nameInput).toBeInTheDocument();
    // the new-task input likewise
    const taskInput = document.getElementById('new-task-sub1');
    expect(taskInput).toBeInTheDocument();
  });

  test('does not add task without a name', () => {
    const props = {
      ...defaultProps,
      project: {
        ...defaultProps.project,
        subprojects: [{ id: 'sub1', text: 'foo', tasks: [], newTaskText: '' }],
      },
    };
    render(<ProjectEditor {...props} />);
    const input = document.getElementById('new-task-sub1');
    // pressing enter when empty should not create a task
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(document.querySelectorAll('.project-editor .task-row').length).toBe(0);
    // typing whitespace and clicking add should also do nothing
    fireEvent.change(input, { target: { value: '   ' } });
    const addBtn = document.querySelector('.add-task-btn');
    fireEvent.click(addBtn);
    expect(document.querySelectorAll('.project-editor .task-row').length).toBe(0);
  });

  test('tasks within a subproject can be reordered via drag and drop', async () => {
    const props = {
      ...defaultProps,
      onApplyChange: jest.fn(),
      project: {
        ...defaultProps.project,
        subprojects: [
          {
            id: 'sub1',
            text: 'foo',
            tasks: [
              { id: 't1', text: 'a', done: false, favorite: false, people: [] },
              { id: 't2', text: 'b', done: false, favorite: false, people: [] },
            ],
            newTaskText: '',
          },
        ],
      },
    };

    render(<ProjectEditor {...props} />);

    // ensure both task rows are rendered in initial order
    let rows = document.querySelectorAll('.project-editor .task-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('a');
    expect(rows[1].textContent).toContain('b');

    // perform drag-reorder: drag first row onto second
    const handle = rows[0].querySelector('.drag-handle');
    fireEvent.dragStart(handle);
    const target = rows[1];
    fireEvent.dragOver(target);
    fireEvent.drop(target);

    // after drop, DOM order should update and onApplyChange should be called
    await screen.findByText('b');
    await waitFor(() => {
      const afterRows = document.querySelectorAll('.project-editor .task-row');
      expect(afterRows[0].textContent).toContain('b');
      expect(afterRows[1].textContent).toContain('a');
    });

    expect(props.onApplyChange).toHaveBeenCalled();
    const applied = props.onApplyChange.mock.calls.pop()[0];
    expect(applied.subprojects[0].tasks[0].text).toBe('b');
    expect(applied.subprojects[0].tasks[1].text).toBe('a');
  });
});
