import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskRow from '../src/TaskRow';

describe('TaskRow component', () => {
  const task = { text: 'row task', done: false, dueDate: '2026-02-20', people: [{ name: 'Alice' }], favorite: false };
  const handleToggle = jest.fn();
  const handleStar = jest.fn();
  const handleDelete = jest.fn();
  const setEditor = jest.fn();

  test('renders checkbox, title, due date, people avatar, star, delete', () => {
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

    expect(container.querySelector('input.task-checkbox')).toBeInTheDocument();
    expect(screen.getByText('row task')).toBeInTheDocument();
    expect(screen.getByText('2026-02-20')).toBeInTheDocument();
    expect(container.querySelector('.avatar')).toBeInTheDocument();
    expect(container.querySelector('.star')).toBeInTheDocument();
    expect(container.querySelector('.delete')).toBeInTheDocument();
  });

  test('click expand calls setEditorTaskIdx', () => {
    render(
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
    fireEvent.click(screen.getByTitle('Expand editor'));
    expect(setEditor).toHaveBeenCalledWith(0);
  });
});