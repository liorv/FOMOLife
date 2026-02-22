import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Task from '../src/Task';

describe('Task component', () => {
  const baseProps = {
    item: { id: 't1', text: 'task1', done: false, favorite: false, dueDate: null, people: [] },
    id: 't1',
    type: 'tasks',
    editorTaskId: null,
    setEditorTaskId: jest.fn(),
    handleToggle: jest.fn(),
    handleStar: jest.fn(),
    handleDelete: jest.fn(),
  };

  test('renders text and toggle checkbox', () => {
    render(<Task {...baseProps} />);
    expect(screen.getByText('task1')).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(baseProps.handleToggle).toHaveBeenCalledWith('t1');
  });

  test('star button toggles favorite', () => {
    render(<Task {...baseProps} />);
    const starBtn = screen.getByLabelText('Star');
    fireEvent.click(starBtn);
    expect(baseProps.handleStar).toHaveBeenCalledWith('t1');
  });

  test('delete button calls handler', () => {
    render(<Task {...baseProps} />);
    const deleteBtn = screen.getByLabelText('Delete');
    fireEvent.click(deleteBtn);
    expect(baseProps.handleDelete).toHaveBeenCalledWith('t1');
  });
});
