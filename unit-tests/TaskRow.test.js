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

    // order: drag handle -> expand icon -> checkbox -> title inside left-group
    const left = container.querySelector('.left-group');
    const dragHandle = left.querySelector('.drag-handle');
    expect(dragHandle).toBeTruthy();
    expect(dragHandle.textContent).toBe('drag_handle');
    // draggable attribute should be present on handle
    expect(dragHandle.getAttribute('draggable')).toBe('true');
    // there should be no extra right margin (icon only)
    expect(window.getComputedStyle(dragHandle).marginRight).toBe('0px');
    // handle should be taken out of layout via absolute positioning
    expect(window.getComputedStyle(dragHandle).position).toBe('absolute');

    // title span should include the full text as a tooltip
    const titleSpan = container.querySelector('.task-title');
    expect(titleSpan.getAttribute('title')).toBe('row task');
    // style should truncate with ellipsis (nowrap)
    const style = window.getComputedStyle(titleSpan);
    expect(style.whiteSpace).toBe('nowrap');

    const icon = left.querySelector('.expand-icon');
    expect(icon).toBeTruthy();
    // collapsed icon should face right
    expect(icon.textContent).toBe('chevron_right');
    const checkbox = icon.nextSibling;
    expect(checkbox.tagName).toBe('INPUT');
    const title = checkbox.nextSibling;
    expect(title.textContent).toBe('row task');
    // days-left should live within the date-container and be centered
    const dateContainer = container.querySelector('.date-container');
    expect(dateContainer).toBeTruthy();
    const date = dateContainer.querySelector('.task-date');
    // due 1/1/2020 with current 1/3/2020 is in the past
    // full text should read "overdue"; short form "OD" also present
    expect(date.querySelector('.full').textContent).toBe('overdue');
    expect(date.querySelector('.short').textContent).toBe('OD');
    expect(date).toHaveStyle('color: rgb(255, 0, 0)');
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
    // ensure right-group is absolutely positioned so icons stay visible
    const rgStyle = window.getComputedStyle(rightGroup);
    expect(rgStyle.position).toBe('absolute');
    expect(rgStyle.right).toBe('4px');
    expect(rgStyle.zIndex).toBe('2');
    // row padding should leave room for the icons
    const row = container.querySelector('.task-row');
    expect(window.getComputedStyle(row).paddingRight).toBe('64px');
    // row should be allowed to shrink below child min-content and not overflow
    const rowStyle = window.getComputedStyle(row);
    expect(rowStyle.minWidth).toBe('0px');
    expect(rowStyle.maxWidth).toBe('100%');
    // title itself has extra right padding so text doesn't touch icons
    const titleStyle = window.getComputedStyle(container.querySelector('.task-title'));
    expect(titleStyle.paddingRight).toBe('8px');

    // simulate narrow viewport: apply media query style manually
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
    window.dispatchEvent(new Event('resize'));
    const titleAfter = window.getComputedStyle(container.querySelector('.task-title'));
    expect(titleAfter.maxWidth).toBe('150px');
    // flex basis should also be fixed at 150px so the field itself shrinks
    expect(titleAfter.flex).toContain('150px');

    // if we simulate a wider viewport we should no longer have a max-width set
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    window.dispatchEvent(new Event('resize'));
    const titleWide = window.getComputedStyle(container.querySelector('.task-title'));
    expect(titleWide.maxWidth).toBe('none');
    // buttons exist but visual centering is handled by CSS rules not visible here
    expect(rightGroup.querySelectorAll('button').length).toBeGreaterThan(0);
    // layout is now handled via CSS classes; ensure checkbox lives inside the left-group
    expect(container.querySelector('.task-checkbox').parentElement).toHaveClass('left-group');

    jest.useRealTimers();
  });

  test('shows overdue when due date is today', () => {
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
    expect(date.querySelector('.full').textContent).toBe('overdue');
    expect(date.querySelector('.short').textContent).toBe('OD');
    jest.useRealTimers();
  });

  test('shows correct text for future due date and pluralization', () => {
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
    expect(date.querySelector('.full').textContent).toBe('3 days left');
    expect(date.querySelector('.short').textContent).toBe('3d');
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

  test('drag handle invokes provided callback', () => {
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
    const handle = container.querySelector('.drag-handle');
    fireEvent.dragStart(handle);
    expect(dragStart).toHaveBeenCalledWith('row-1', expect.any(Object));
  });

  // inline editing has been removed; title remains read-only even when row is open
});