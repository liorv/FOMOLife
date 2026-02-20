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

  test('renders input controls for tasks', () => {
    render(<AddBar {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Add a new task/)).toBeInTheDocument();
    const addBtn = screen.getByText('Add');
    fireEvent.click(addBtn);
    expect(defaultProps.onAdd).toHaveBeenCalled();
  });

  test('omits due date when not tasks', () => {
    render(<AddBar {...defaultProps} type="projects" />);
    expect(screen.queryByTitle('Due date')).toBeNull();
  });
});
