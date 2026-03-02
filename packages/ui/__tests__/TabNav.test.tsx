import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabNav } from '../src/TabNav';

test('TabNav renders tabs and handles click', () => {
  type Tab = 'a' | 'b';
  const tabs = [
    { key: 'a', label: 'A', icon: 'a' },
    { key: 'b', label: 'B', icon: 'b' },
  ] as const;
  const change = jest.fn();
  render(<TabNav active="a" tabs={tabs} onChange={change} />);
  expect(screen.getByText('A')).toBeInTheDocument();
  fireEvent.click(screen.getByText('B'));
  expect(change).toHaveBeenCalledWith('b');
});