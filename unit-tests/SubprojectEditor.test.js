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
    // header should include add-task button now that the input row is gone
    const addBtn = document.querySelector('.add-task-header-btn');
    expect(addBtn).toBeTruthy();
    expect(addBtn.textContent).toContain('Task');
    expect(addBtn.title).toBe('AddTask');
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
    // choose the "Edit" menu item
    const editItem = document.querySelector('.project-menu-dropdown .edit-menu-item');
    expect(editItem).toBeTruthy();
    // delete item should also exist
    const deleteItem = document.querySelector('.project-menu-dropdown .delete-menu-item');
    expect(deleteItem).toBeTruthy();
    fireEvent.click(editItem);
    expect(defaultHandlers.onToggleCollapse).toHaveBeenCalled();
  });



  test('calls onToggleCollapse when collapse button is clicked', () => {
    render(<SubprojectEditor sub={defaultSub} {...defaultHandlers} />);
    const btn = screen.getByTitle('Hide tasks');
    fireEvent.click(btn);
    expect(defaultHandlers.onToggleCollapse).toHaveBeenCalled();
  });

test('header add button shows AddBar and allows adding tasks', async () => {
    const handlers = { ...defaultHandlers, onAddTask: jest.fn() };
    const subWithTasks = { ...defaultSub, tasks: [] };
    const { rerender } = render(<SubprojectEditor sub={subWithTasks} {...handlers} />);

    const addBtn = document.querySelector('.add-task-header-btn');
    expect(addBtn).toBeTruthy();
    expect(addBtn.textContent).toContain('Task');
    expect(addBtn.title).toBe('AddTask');
    
    // Click plus button to show AddBar
    fireEvent.click(addBtn);
    
    // AddBar should become visible
    const addBarInput = document.querySelector('.add-bar-wrapper input');
    expect(addBarInput).toBeTruthy();
    
    // Type a task name
    fireEvent.change(addBarInput, { target: { value: 'My Task' } });
    
    // Click add button in AddBar
    const addBarBtn = document.querySelector('.add-bar-wrapper .add-btn');
    fireEvent.click(addBarBtn);
    
    // onAddTask should be called with the typed text
    expect(handlers.onAddTask).toHaveBeenCalledTimes(1);
    expect(handlers.onAddTask).toHaveBeenCalledWith('My Task');
  });

  test('AddBar closes when clicking outside', async () => {
    const handlers = { ...defaultHandlers };
    const subWithTasks = { ...defaultSub, tasks: [] };
    render(<SubprojectEditor sub={subWithTasks} {...handlers} />);

    // Click plus button to show AddBar
    const addBtn = document.querySelector('.add-task-header-btn');
    fireEvent.click(addBtn);
    
    // AddBar should be visible
    let addBarInput = document.querySelector('.add-bar-wrapper input');
    expect(addBarInput).toBeTruthy();
    
    // Click outside the AddBar
    fireEvent.mouseDown(document.body);
    
    // AddBar should be hidden
    addBarInput = document.querySelector('.add-bar-wrapper input');
    expect(addBarInput).not.toBeTruthy();
  });

  test('AddBar closes when pressing Escape', async () => {
    const handlers = { ...defaultHandlers };
    const subWithTasks = { ...defaultSub, tasks: [] };
    render(<SubprojectEditor sub={subWithTasks} {...handlers} />);

    // Click plus button to show AddBar
    const addBtn = document.querySelector('.add-task-header-btn');
    fireEvent.click(addBtn);
    
    // AddBar should be visible
    let addBarInput = document.querySelector('.add-bar-wrapper input');
    expect(addBarInput).toBeTruthy();
    
    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    
    // AddBar should be hidden
    addBarInput = document.querySelector('.add-bar-wrapper input');
    expect(addBarInput).not.toBeTruthy();
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
    // start drag on the row itself
    fireEvent.dragStart(rows[0]);
    fireEvent.dragOver(rows[1]);
    fireEvent.drop(rows[1]);
    // because handlers are mocks, just make sure drop handler called
    expect(defaultHandlers.onDrop).toHaveBeenCalled();
  });

  test('inline title edits within a subproject call provided callback', () => {
    const handlers = { ...defaultHandlers, onTaskTitleChange: jest.fn() };
    const subWithTasks = { ...defaultSub, tasks: [{ id: 't1', text: 'foo', done: false, favorite: false, people: [] }] };
    const { container } = render(<SubprojectEditor sub={subWithTasks} {...handlers} />);
    const titleSpan = container.querySelector('.task-title');
    fireEvent.click(titleSpan);
    const input = container.querySelector('input.task-title-input');
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'bar' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(handlers.onTaskTitleChange).toHaveBeenCalledWith('t1', 'bar');
  });
});
