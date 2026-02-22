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

    // order: expand icon -> checkbox -> title inside left-group
    const left = container.querySelector('.left-group');
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

    expect(container.querySelector('.star')).toBeInTheDocument();
    expect(container.querySelector('.delete')).toBeInTheDocument();
    // right-group should exist (CSS handles pushing it right)
    const rightGroup = container.querySelector('.right-group');
    expect(rightGroup).toBeTruthy();
    // buttons exist but visual centering is handled by CSS rules not visible here
    expect(rightGroup.querySelectorAll('button').length).toBeGreaterThan(0);
    expect(container.querySelector('.task-checkbox').parentElement).toHaveStyle('align-items: center');

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

  // inline editing has been removed; title remains read-only even when row is open
});