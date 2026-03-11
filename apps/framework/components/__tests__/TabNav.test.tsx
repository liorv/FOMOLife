/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabNav } from '@myorg/ui';

describe('TabNav', () => {
  const tabs = [
    { key: 'tasks', label: 'A', icon: 'home' },
    { key: 'people', label: 'B', icon: 'settings' },
  ];

  it('renders buttons and calls onChange when clicked', () => {
    const onChange = jest.fn();
    render(<TabNav active="a" tabs={tabs} onChange={onChange} />);

    const buttonB = screen.getByText('B').closest('button');
    expect(buttonB).toBeInTheDocument();
    fireEvent.click(buttonB!);
    expect(onChange).toHaveBeenCalledWith('people');
  });

  it('applies active class and aria-current', () => {
    render(<TabNav active="people" tabs={tabs} onChange={() => {}} />);
    const activeBtn = screen.getByText('B').closest('button')!;
    expect(activeBtn).toHaveClass('active');
    expect(activeBtn).toHaveAttribute('aria-current', 'page');
  });
});
