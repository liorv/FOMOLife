import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TabNav from '../src/components/TabNav';

describe('TabNav', () => {
  test('renders tabs and handles selection', () => {
    const onChange = jest.fn();
    render(<TabNav active="tasks" onChange={onChange} />);
    const tasksButton = screen.getByText('Tasks');
    fireEvent.click(tasksButton);
    expect(onChange).toHaveBeenCalledWith('tasks');
    const peopleButton = screen.getByText('People');
    fireEvent.click(peopleButton);
    expect(onChange).toHaveBeenCalledWith('people');
  });
});
