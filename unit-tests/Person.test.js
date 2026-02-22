import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Person from '../src/components/Person';

describe('Person component', () => {
  const baseProps = {
    person: { id: 'p1', name: 'Bob', methods: { discord: true, sms: false, whatsapp: false } },
    id: 'p1',
    editingPersonId: null,
    editingPersonName: '',
    setEditingPersonId: jest.fn(),
    setEditingPersonName: jest.fn(),
    onSaveEdit: jest.fn(),
    onCancelEdit: jest.fn(),
    handleTogglePersonDefault: jest.fn(),
    handleDelete: jest.fn(),
    asRow: true,
  };

  test('renders name and toggle handlers', () => {
    render(<Person {...baseProps} />);
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // clicking name should trigger edit mode
    fireEvent.click(screen.getByText('Bob'));
    expect(baseProps.setEditingPersonId).toHaveBeenCalledWith('p1');
  });

  test('delete button calls handler', () => {
    render(<Person {...baseProps} />);
    const deleteBtn = screen.getByLabelText('Delete person');
    fireEvent.click(deleteBtn);
    expect(baseProps.handleDelete).toHaveBeenCalledWith('p1');
  });
});
