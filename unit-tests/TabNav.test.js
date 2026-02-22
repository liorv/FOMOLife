import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TabNav from '../src/components/TabNav';

// helpers to mimic resize
const setWidth = width => {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
};

describe('TabNav', () => {
  test('renders tabs with icons and handles selection', () => {
    const onChange = jest.fn();
    render(<TabNav active="tasks" onChange={onChange} />);
    // each tab should render a material icon element
    const icons = screen.getAllByText((content, element) => element.classList.contains('tab-icon'));
    expect(icons.length).toBe(4);

    const tasksButton = screen.getByText('Tasks');
    fireEvent.click(tasksButton);
    expect(onChange).toHaveBeenCalledWith('tasks');
    const peopleButton = screen.getByText('People');
    fireEvent.click(peopleButton);
    expect(onChange).toHaveBeenCalledWith('people');
  });


});
