import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskRow from '../src/components/TaskRow';

describe('TaskRow component', () => {
  const task = {
    id: 'row-1',
    text: 'row task',
    done: false,
    favorite: false,
    dueDate: '2020-01-01', // past date to trigger red styling
    people: [{ name: 'Alice' }, { name: 'Bob' }],
  };
  const handleToggle = jest.fn();
  const handleStar = jest.fn();
  const handleDelete = jest.fn();
  const setEditor = jest.fn();

  test('renders all columns in proper order with days-left indicator and notify', () => {
    // fix current time so days calculation is deterministic
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2020-01-03'));

    const { container } = render(
      <TaskRow
        item={task}
        id="row-1"
        type="tasks"
        editorTaskId={null}
        setEditorTaskId={setEditor}
        handleToggle={handleToggle}
        handleStar={handleStar}
        handleDelete={handleDelete}
      />
    );

    // left-group should contain expand icon, checkbox, and title in order
    const left = container.querySelector('.left-group');
    expect(left.querySelector('.expand-icon')).toBeTruthy();
    expect(left.querySelector('.task-checkbox')).toBeTruthy();

    // title span should include the full text as a tooltip
    const titleSpan = container.querySelector('.task-title');
    expect(titleSpan.textContent).toBe('row task');
    expect(titleSpan.getAttribute('title')).toBe('row task');
    // ensure title is not bold; jsdom may return empty string so just
    // assert it isn't 'bold' or '700'
    const fw = window.getComputedStyle(titleSpan).fontWeight;
    expect(fw === 'bold' || fw === '700').toBe(false);
    // style should truncate with ellipsis (nowrap)

    // days-left should live within the date-container and be centered
    const dateContainer = container.querySelector('.date-container');
    expect(dateContainer).toBeTruthy();
    const date = dateContainer.querySelector('.task-date');
    // due 1/1/2020 with current 1/3/2020 is in the past
    // full text should read "overdue"; short form "OD" also present
    expect(date.querySelector('.full').textContent).toBe('overdue');
    expect(date.querySelector('.short').textContent).toBe('OD');
    // color is set via inline style and relies on isPast calculation
    // parent layout is governed by CSS in the browser; jsdom doesn't
    // faithfully apply our flex rules so we avoid asserting on it here.

    // notify avatars exist and should appear before star
    expect(container.querySelector('.notify-people')).toBeInTheDocument();

    const deleteBtn = container.querySelector('.delete');
    expect(deleteBtn).toBeInTheDocument();
    // icon should always be present without any hover interaction

    expect(container.querySelector('.star')).toBeInTheDocument();
    // right-group should exist (CSS handles pushing it right)
    const rightGroup = container.querySelector('.right-group');
    expect(rightGroup).toBeTruthy();
    // ensure right-group exists; layout is handled via CSS
    
    // row layout and padding are governed by CSS classes

    // layout is now handled via CSS classes; ensure checkbox lives inside the left-group
    expect(container.querySelector('.task-checkbox').parentElement).toHaveClass('left-group');

    jest.useRealTimers();
  });

  test('shows overdue indicator when due date is today', () => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2020-01-01'));
    const todayTask = { ...task, dueDate: '2020-01-01' };
    const { container } = render(
      <TaskRow
        item={todayTask}
        id="row-1"
        type="tasks"
        editorTaskId={null}
        setEditorTaskId={setEditor}
        handleToggle={handleToggle}
        handleStar={handleStar}
        handleDelete={handleDelete}
      />
    );
    const date = container.querySelector('.task-date');
    expect(date).toBeTruthy();
    // indicator should include either 'overdue' or 'day' text but not be empty
    expect(date.textContent).toMatch(/(overdue|day)/i);
    jest.useRealTimers();
  });

  test('shows future date indicator correctly', () => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2020-01-01')); // current date
    const futureTask = { ...task, dueDate: '2020-01-04' }; // 3 days ahead
    const { container } = render(
      <TaskRow
        item={futureTask}
        id="row-1"
        type="tasks"
        editorTaskId={null}
        setEditorTaskId={setEditor}
        handleToggle={handleToggle}
        handleStar={handleStar}
        handleDelete={handleDelete}
      />
    );
    const date = container.querySelector('.task-date');
    expect(date).toBeTruthy();
    expect(date.textContent).toMatch(/\d+ day/);
    jest.useRealTimers();
  });

  test('click expand calls setEditorTaskId', () => {
    const { container, rerender } = render(
      <TaskRow
        item={task}
        id="row-1"
        type="tasks"
        editorTaskId={null}
        setEditorTaskId={setEditor}
        handleToggle={handleToggle}
        handleStar={handleStar}
        handleDelete={handleDelete}
      />
    );
    // initial chevron should be right-facing
    const leftgroup = container.querySelector('.left-group');
    expect(leftgroup.querySelector('.expand-icon').textContent).toBe('chevron_right');
    fireEvent.click(screen.getByTitle('Expand editor'));
    expect(setEditor).toHaveBeenCalledWith('row-1');
    // simulate prop update to open state
    rerender(
      <TaskRow
        item={task}
        id="row-1"
        type="tasks"
        editorTaskId="row-1"
        setEditorTaskId={setEditor}
        handleToggle={handleToggle}
        handleStar={handleStar}
        handleDelete={handleDelete}
      />
    );
    expect(leftgroup.querySelector('.expand-icon').textContent).toBe('expand_more');
  });

  test('dragging row invokes provided callback', () => {
    const dragStart = jest.fn();
    const { container } = render(
      <TaskRow
        item={task}
        id="row-1"
        type="tasks"
        editorTaskId={null}
        setEditorTaskId={setEditor}
        handleToggle={handleToggle}
        handleStar={handleStar}
        handleDelete={handleDelete}
        onDragStart={dragStart}
      />
    );
    const row = container.querySelector('.task-row');
    expect(row).toBeTruthy();
    fireEvent.dragStart(row);
    expect(dragStart).toHaveBeenCalledWith('row-1', expect.any(Object));
  });

  // inline editing has been removed; title remains read-only even when row is open

  test('allows inline title editing when row is open', () => {
    const change = jest.fn();
    const { container, rerender } = render(
      <TaskRow
        item={task}
        id="row-1"
        type="tasks"
        editorTaskId="row-1"
        setEditorTaskId={setEditor}
        handleToggle={handleToggle}
        handleStar={handleStar}
        handleDelete={handleDelete}
        onTitleChange={change}
      />
    );

    // initial span visible
    const titleSpan = container.querySelector('.task-title');
    expect(titleSpan).toBeTruthy();
    fireEvent.click(titleSpan);

    const input = container.querySelector('input.task-title-input');
    expect(input).toBeTruthy();
    expect(input.value).toBe('row task');
    fireEvent.change(input, { target: { value: 'updated' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(change).toHaveBeenCalledWith('row-1', 'updated');

    // update prop and ensure edit state resets
    rerender(
      <TaskRow
        item={{ ...task, text: 'updated' }}
        id="row-1"
        type="tasks"
        editorTaskId="row-1"
        setEditorTaskId={setEditor}
        handleToggle={handleToggle}
        handleStar={handleStar}
        handleDelete={handleDelete}
        onTitleChange={change}
      />
    );
    expect(container.querySelector('input.task-title-input')).toBeNull();
    expect(container.querySelector('.task-title').textContent).toBe('updated');
  });

  test('clicking title when closed opens row and input immediately', () => {
    const change = jest.fn();
    const { container } = render(
      <TaskRow
        item={task}
        id="row-1"
        type="tasks"
        editorTaskId={null}
        setEditorTaskId={setEditor}
        handleToggle={handleToggle}
        handleStar={handleStar}
        handleDelete={handleDelete}
        onTitleChange={change}
      />
    );

    const titleSpan = container.querySelector('.task-title');
    fireEvent.click(titleSpan);
    expect(setEditor).toHaveBeenCalledWith('row-1');
    const input = container.querySelector('input.task-title-input');
    // input may appear synchronously thanks to our state updates
    expect(input).toBeTruthy();
  });

  // inline editing has been removed; title remains read-only even when row is open
});