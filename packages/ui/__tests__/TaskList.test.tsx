import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TaskList } from '../src';
import TaskRow from '../src/TaskList/TaskRow';
import type { TaskItem } from '@myorg/types';

test('TaskList renders items and handles click callbacks', () => {
  const items: TaskItem[] = [
    { id: '1', text: 'First task', done: false, favorite: false },
    { id: '2', text: 'Second task', done: true, favorite: true },
  ];
  const toggle = jest.fn();
  const star = jest.fn();
  const del = jest.fn();

  const { getByText } = render(
    <TaskList
      items={items}
      type="tasks"
      handleToggle={toggle}
      handleStar={star}
      handleDelete={del}
    />
  );

  expect(getByText('First task')).toBeInTheDocument();
  expect(getByText('Second task')).toBeInTheDocument();
});

test('the padded checkbox label toggles once without opening the editor', () => {
  const toggle = jest.fn();
  const openEditor = jest.fn();
  render(
    <TaskRow
      item={{ id: '1', text: 'Daily task', done: false }}
      id="1"
      type="tasks"
      editorTaskId={null}
      setEditorTaskId={openEditor}
      handleToggle={toggle}
    />
  );
  const checkbox = screen.getByRole('checkbox', { name: 'Mark as complete: Daily task' });
  const target = checkbox.closest('label')!;
  expect(target).toHaveClass('task-checkbox-target');
  fireEvent.click(target);
  expect(toggle).toHaveBeenCalledTimes(1);
  expect(toggle).toHaveBeenCalledWith('1');
  expect(openEditor).not.toHaveBeenCalled();

  fireEvent.click(checkbox);
  expect(toggle).toHaveBeenCalledTimes(2);
  expect(openEditor).not.toHaveBeenCalled();
});