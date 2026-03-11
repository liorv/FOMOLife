import React from 'react';
import { render } from '@testing-library/react';
import { TaskList } from '../src';
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