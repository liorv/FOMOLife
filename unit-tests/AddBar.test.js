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

  test('renders input controls for tasks without calendar and hints Enter', () => {
    render(<AddBar {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Add a new task/i);
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toMatch(/press Enter/i);
    // calendar button should not exist
    expect(screen.queryByTitle('Select due date')).toBeNull();
    // hitting enter triggers onAdd
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(defaultProps.onAdd).toHaveBeenCalled();
  });

  test('omits due date when not tasks', () => {
    render(<AddBar {...defaultProps} type="projects" />);
    expect(screen.queryByTitle('Due date')).toBeNull();
    const input = screen.getByPlaceholderText(/Add a new project/i);
    expect(input.placeholder).toMatch(/press Enter/i);
  });

  // calendar overlay tests removed since button is gone
});
