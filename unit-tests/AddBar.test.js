import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AddBar from '../src/components/AddBar';

describe('AddBar', () => {
  const defaultProps = {
    type: 'tasks',
    input: '',
    dueDate: '',
    onInputChange: jest.fn(),
    onDueDateChange: jest.fn(),
    onAdd: jest.fn(),
  };

  test('renders input controls for tasks including calendar icon', () => {
    render(<AddBar {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Add a new task/)).toBeInTheDocument();
    // calendar button should appear instead of visible date input
    const calBtn = screen.getByTitle('Select due date');
    expect(calBtn).toBeInTheDocument();
    expect(calBtn.querySelector('.material-icons').textContent).toBe('calendar_today');
    const hiddenInput = document.getElementById('addbar-date');
    expect(hiddenInput).toBeTruthy();
    expect(hiddenInput.type).toBe('date');
    const addBtn = screen.getByText('Add');
    fireEvent.click(addBtn);
    expect(defaultProps.onAdd).toHaveBeenCalled();
  });

  test('omits due date when not tasks', () => {
    render(<AddBar {...defaultProps} type="projects" />);
    expect(screen.queryByTitle('Due date')).toBeNull();
  });
});
