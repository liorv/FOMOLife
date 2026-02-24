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
    expect(addBtn.textContent).toContain('Plus task');
    expect(addBtn.title).toBe('Plus task');
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
    const editItem = document.querySelector('.subproject-row-menu .edit-item');
    expect(editItem).toBeTruthy();
    // delete item should also exist
    const deleteItem = document.querySelector('.subproject-row-menu .delete-item');
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

test('header add button calls onAddTask and avoids duplicate blank tasks', () => {
    const handlers = { ...defaultHandlers, onAddTask: jest.fn() };
    const subWithTasks = { ...defaultSub, tasks: [] };
    const { rerender } = render(<SubprojectEditor sub={subWithTasks} {...handlers} />);

    const addBtn = document.querySelector('.add-task-header-btn');
    expect(addBtn).toBeTruthy();
    expect(addBtn.textContent).toContain('Plus task');
    expect(addBtn.title).toBe('Plus task');
    fireEvent.click(addBtn);
    expect(handlers.onAddTask).toHaveBeenCalledTimes(1);
    expect(handlers.onAddTask).toHaveBeenCalledWith("", true);

    // simulate parent having added an empty task and re-render
    subWithTasks.tasks = [{ id: 't1', text: '' }];
    rerender(<SubprojectEditor sub={subWithTasks} {...handlers} />);
    fireEvent.click(addBtn);
    expect(handlers.onAddTask).toHaveBeenCalledTimes(1);
    // still no additional call; args should remain same
    expect(handlers.onAddTask).toHaveBeenCalledWith("", true);
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
});
