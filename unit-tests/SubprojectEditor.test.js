import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SubprojectEditor from '../src/components/SubprojectEditor';
import SubprojectRow from '../src/components/SubprojectRow';

const defaultSub = {
  id: 'sub1',
  text: 'foo',
  tasks: [],
  collapsed: false,
};

const defaultHandlers = {
  editorTaskId: null,
  setEditorTaskId: jest.fn(),
  onDelete: jest.fn(),
  onUpdateText: jest.fn(),
  onToggleCollapse: jest.fn(),
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
    // header no longer renders its own add-button (and the FAB is hidden
    // when expanded) so no duplicate add controls appear.
    expect(document.querySelector('.add-task-header-btn')).toBeNull();
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

  test('add-bar input is automatically focused when expanded', () => {
    const handlers = { ...defaultHandlers, onAddTask: jest.fn() };
    render(<SubprojectEditor sub={defaultSub} {...handlers} />);
    const input = document.querySelector('.add-bar-wrapper .add-bar input');
    expect(input).toBe(document.activeElement);
  });

  test('clicking header area collapses subproject except when clicking pencil', () => {
    render(<SubprojectEditor sub={defaultSub} {...defaultHandlers} />);
    // reset history so previous tests won't interfere
    defaultHandlers.onToggleCollapse.mockClear();

    const nameSpan = document.querySelector('.subproject-name-display');
    fireEvent.click(nameSpan);
    expect(defaultHandlers.onToggleCollapse).toHaveBeenCalledTimes(1);

    // clicking pencil should not collapse
    defaultHandlers.onToggleCollapse.mockClear();
    const editBtn = document.querySelector('.subproject-name-edit-btn');
    fireEvent.click(editBtn);
    expect(defaultHandlers.onToggleCollapse).not.toHaveBeenCalled();
  });



  test('user can add tasks via the inline add-bar', () => {
    const handlers = { ...defaultHandlers, onAddTask: jest.fn() };
    render(<SubprojectEditor sub={defaultSub} {...handlers} />);
    const input = document.querySelector('.add-bar-wrapper .add-bar input');
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'new task' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(handlers.onAddTask).toHaveBeenCalledWith('new task', false);

    // clicking button should also work
    fireEvent.change(input, { target: { value: 'second' } });
    const btn = document.querySelector('.add-bar-wrapper .add-bar .add-btn');
    fireEvent.click(btn);
    expect(handlers.onAddTask).toHaveBeenCalledWith('second', false);
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

    // verify two rows rendered, and that they live inside the .subproject container
    const rows = document.querySelectorAll('.subproject .task-row');
    expect(rows.length).toBe(2);
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
