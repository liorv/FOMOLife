/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabNav } from '@myorg/ui';

describe('TabNav', () => {
  const tabs = [
    { key: 'a', label: 'A', icon: 'home' },
    { key: 'b', label: 'B', icon: 'settings' },
  ];

  it('renders buttons and calls onChange when clicked', () => {
    const onChange = jest.fn();
    render(<TabNav active="a" tabs={tabs} onChange={onChange} />);

    const buttonB = screen.getByText('B').closest('button');
    expect(buttonB).toBeInTheDocument();
    fireEvent.click(buttonB!);
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('applies active class and aria-current', () => {
    render(<TabNav active="b" tabs={tabs} onChange={() => {}} />);
    const activeBtn = screen.getByRole('button', { name: /b/i });
    expect(activeBtn).toHaveClass('active');
    expect(activeBtn).toHaveAttribute('aria-current', 'page');
  });
});
