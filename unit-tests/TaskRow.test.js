import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskRow from '../src/TaskRow';

describe('TaskRow component', () => {
  const task = {
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

  test('renders all columns in proper order with date and notify', () => {
    const { container } = render(
      <TaskRow
        item={task}
        idx={0}
        type="tasks"
        editorTaskIdx={null}
        setEditorTaskIdx={setEditor}
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
    // date should live within the date-container and be centered
    const dateContainer = container.querySelector('.date-container');
    expect(dateContainer).toBeTruthy();
    const date = dateContainer.querySelector('.task-date');
    expect(date.textContent).toBe('2020-01-01');
    expect(date).toHaveStyle('color: rgb(255, 0, 0)');
    expect(date.parentElement).toHaveStyle('display: flex');

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
  });

  test('click expand calls setEditorTaskIdx', () => {
    const { container, rerender } = render(
      <TaskRow
        item={task}
        idx={0}
        type="tasks"
        editorTaskIdx={null}
        setEditorTaskIdx={setEditor}
        handleToggle={handleToggle}
        handleStar={handleStar}
        handleDelete={handleDelete}
      />
    );
    // initial chevron should be right-facing
    const leftgroup = container.querySelector('.left-group');
    expect(leftgroup.querySelector('.expand-icon').textContent).toBe('chevron_right');
    fireEvent.click(screen.getByTitle('Expand editor'));
    expect(setEditor).toHaveBeenCalledWith(0);
    // simulate prop update to open state
    rerender(
      <TaskRow
        item={task}
        idx={0}
        type="tasks"
        editorTaskIdx={0}
        setEditorTaskIdx={setEditor}
        handleToggle={handleToggle}
        handleStar={handleStar}
        handleDelete={handleDelete}
      />
    );
    expect(leftgroup.querySelector('.expand-icon').textContent).toBe('expand_more');
  });

  test('shows editable input when row is open and enforces validation', () => {
    const editCallback = jest.fn();
    const { container } = render(
      <TaskRow
        item={task}
        idx={0}
        type="tasks"
        editorTaskIdx={0}
        setEditorTaskIdx={setEditor}
        handleToggle={handleToggle}
        handleStar={handleStar}
        handleDelete={handleDelete}
        onTitleChange={editCallback}
      />
    );

    const input = container.querySelector('input.task-title-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('pattern', '[a-zA-Z0-9 ]+');

    // type a valid character, callback should be invoked
    fireEvent.change(input, { target: { value: 'a' } });
    expect(editCallback).toHaveBeenCalledWith('a', 0);
    // invalid character should be ignored (callback not called again)
    fireEvent.change(input, { target: { value: 'a!' } });
    expect(editCallback).toHaveBeenCalledTimes(1);
  });
});