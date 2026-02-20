import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Task from '../src/Task';

describe('Task component', () => {
  const baseProps = {
    item: { text: 'task1', done: false, favorite: false, dueDate: null, people: [] },
    idx: 0,
    type: 'tasks',
    editorTaskIdx: null,
    setEditorTaskIdx: jest.fn(),
    handleToggle: jest.fn(),
    handleStar: jest.fn(),
    handleDelete: jest.fn(),
  };

  test('renders text and toggle checkbox', () => {
    render(<Task {...baseProps} />);
    expect(screen.getByText('task1')).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(baseProps.handleToggle).toHaveBeenCalledWith(0);
  });

  test('star button toggles favorite', () => {
    render(<Task {...baseProps} />);
    const starBtn = screen.getByLabelText('Star');
    fireEvent.click(starBtn);
    expect(baseProps.handleStar).toHaveBeenCalledWith(0);
  });

  test('delete button calls handler', () => {
    render(<Task {...baseProps} />);
    const deleteBtn = screen.getByLabelText('Delete');
    fireEvent.click(deleteBtn);
    expect(baseProps.handleDelete).toHaveBeenCalledWith(0);
  });
});
