import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SubprojectEditor from '../src/components/SubprojectEditor';
import SubprojectRow from '../src/components/SubprojectRow';

const defaultSub = {
  id: 'sub1',
  text: 'foo',
  tasks: [],
  newTaskText: '',
  collapsed: false,
};

const defaultHandlers = {
  editorTaskId: null,
  setEditorTaskId: jest.fn(),
  onDelete: jest.fn(),
  onUpdateText: jest.fn(),
  onToggleCollapse: jest.fn(),
  onUpdateNewTask: jest.fn(),
  onAddTask: jest.fn(),
  handleTaskToggle: jest.fn(),
  handleTaskStar: jest.fn(),
  handleTaskDelete: jest.fn(),
  onDragStart: jest.fn(),
  onDragOver: jest.fn(),
  onDrop: jest.fn(),
  onDragEnd: jest.fn(),
  onEditorSave: jest.fn(),
  onEditorUpdate: jest.fn(),
  onEditorClose: jest.fn(),
  allPeople: [],
  onOpenPeople: jest.fn(),
  onCreatePerson: jest.fn(),
};

describe('SubprojectEditor', () => {
  test('renders subproject name as static text when expanded', () => {
    render(<SubprojectEditor sub={defaultSub} {...defaultHandlers} />);
    const nameDisplay = document.querySelector('.subproject-name-display');
    expect(nameDisplay).toBeInTheDocument();
    expect(nameDisplay.textContent).toBe(defaultSub.text);
    // input should not exist anymore
    expect(document.getElementById('subproject-name-sub1')).toBeNull();
    const taskInput = document.getElementById('new-task-sub1');
    expect(taskInput).toBeInTheDocument();
  });

  test('shows SubprojectRow when collapsed and edit button works', () => {
    const collapsedSub = { ...defaultSub, collapsed: true };
    render(<SubprojectEditor sub={collapsedSub} {...defaultHandlers} />);
    // SubprojectRow should render instead of inputs
    expect(document.querySelector('.subproject-row')).toBeTruthy();
    // original name input should not exist
    expect(document.getElementById('subproject-name-sub1')).toBeNull();
    // click edit icon should trigger onToggleCollapse via onEdit
    const menuBtn = document.querySelector('.subproject-row .menu-button');
    fireEvent.click(menuBtn);
    expect(defaultHandlers.onToggleCollapse).toHaveBeenCalled();
  });

  test('inline editing via row updates text and calls onApplyChange', () => {
    const changed = jest.fn();
    const props = {
      ...defaultHandlers,
      project: {
        ...defaultHandlers.project,
        subprojects: [
          { id: 'sub1', text: 'foo', tasks: [], newTaskText: '', collapsed: true },
        ],
      },
      onApplyChange: changed,
    };
    render(<SubprojectEditor {...props} />);
    // click the title to start editing
    const titleSpan = screen.getByText('foo');
    fireEvent.click(titleSpan);
    const input = document.querySelector('.subproject-row-name-input');
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'bar' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    expect(changed).toHaveBeenCalled();
    const applied = changed.mock.calls.pop()[0];
    expect(applied.subprojects[0].text).toBe('bar');
  });

  test('calls onToggleCollapse when collapse button is clicked', () => {
    render(<SubprojectEditor sub={defaultSub} {...defaultHandlers} />);
    const btn = screen.getByTitle('Hide tasks');
    fireEvent.click(btn);
    expect(defaultHandlers.onToggleCollapse).toHaveBeenCalled();
  });

  test('does not invoke add handler for empty task', () => {
    render(<SubprojectEditor sub={defaultSub} {...defaultHandlers} />);
    const input = document.getElementById('new-task-sub1');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(defaultHandlers.onAddTask).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '   ' } });
    const btn = screen.getByTitle('Add task');
    fireEvent.click(btn);
    expect(defaultHandlers.onAddTask).not.toHaveBeenCalled();
  });

  test('drag and drop props are passed through to TaskList and reorder logic can be triggered', async () => {
    const subWithTasks = {
      ...defaultSub,
      tasks: [
        { id: 't1', text: 'a', done: false, favorite: false, people: [] },
        { id: 't2', text: 'b', done: false, favorite: false, people: [] },
      ],
    };
    render(
      <SubprojectEditor sub={subWithTasks} {...defaultHandlers} />
    );

    // verify two rows rendered
    expect(document.querySelectorAll('.task-row').length).toBe(2);
    const rows = document.querySelectorAll('.task-row');
    const handle = rows[0].querySelector('.drag-handle');
    fireEvent.dragStart(handle);
    fireEvent.dragOver(rows[1]);
    fireEvent.drop(rows[1]);
    // because handlers are mocks, just make sure drop handler called
    expect(defaultHandlers.onDrop).toHaveBeenCalled();
  });
});
