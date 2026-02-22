import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogoBar from '../src/components/LogoBar';

describe('LogoBar component', () => {
  test('renders logo and optional search field', () => {
    const change = jest.fn();
    const { rerender } = render(
      <LogoBar searchQuery="" onSearchChange={change} showSearch={false} />
    );
    const logo = screen.getByAltText('FOMO logo');
    expect(logo).toBeInTheDocument();
    // logo should be the first element inside the bar (left-aligned)
    expect(logo.parentElement.firstChild).toBe(logo);
    expect(screen.queryByPlaceholderText('Search tasks…')).toBeNull();

    rerender(
      <LogoBar searchQuery="" onSearchChange={change} showSearch={true} />
    );
    const input = screen.getByPlaceholderText('Search tasks…');
    expect(input).toBeInTheDocument();
    // icon should appear inside the search container
    const icon = document.querySelector('.search-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.textContent).toBe('search');

    fireEvent.change(input, { target: { value: 'xyz' } });
    expect(change).toHaveBeenCalledWith('xyz');
  });
});
