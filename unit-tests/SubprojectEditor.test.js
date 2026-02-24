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
  test('renders inputs with ids based on subproject id', () => {
    render(<SubprojectEditor sub={defaultSub} {...defaultHandlers} />);
    const nameInput = document.getElementById('subproject-name-sub1');
    expect(nameInput).toBeInTheDocument();
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
    const editBtn = document.querySelector('.subproject-row .edit');
    fireEvent.click(editBtn);
    expect(defaultHandlers.onToggleCollapse).toHaveBeenCalled();
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
