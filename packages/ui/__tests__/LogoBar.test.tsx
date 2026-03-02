import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogoBar } from '../src/LogoBar';

test('LogoBar renders and responds to search change', () => {
  const change = jest.fn();
  render(<LogoBar showSearch={true} searchValue="" onSearchChange={change} />);
  expect(screen.getByRole('banner')).toBeInTheDocument();
  const input = screen.getByPlaceholderText(/Search/i);
  fireEvent.change(input, { target: { value: 'foo' } });
  expect(change).toHaveBeenCalledWith('foo');
});