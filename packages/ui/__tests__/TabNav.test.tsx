import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabNav } from '../src';

test('TabNav renders tabs and handles click', () => {
  type Tab = 'tasks' | 'people';
  const tabs = [
    { key: 'tasks', label: 'A', icon: 'a' },
    { key: 'people', label: 'B', icon: 'b' },
  ];
  const change = jest.fn();
  const { rerender } = render(<TabNav active="tasks" tabs={tabs} onChange={change} />);
  const btnA = screen.getByText('A').closest('button');
  expect(btnA).toBeInTheDocument();
  expect(btnA).toHaveClass('tab-tasks');
  // hamburger placeholder should be rendered
  const ham = screen.getByLabelText('Menu');
  expect(ham).toBeInTheDocument();
  expect(ham).toHaveClass('tab-hamburger');
  fireEvent.click(screen.getByText('B'));
  expect(change).toHaveBeenCalledWith('people');

});