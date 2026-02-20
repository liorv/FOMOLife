import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskEditor from '../src/TaskModal';

describe('TaskEditor component', () => {
  const task = { text: 'foo', description: '', people: [] };
  const onSave = jest.fn();
  const onClose = jest.fn();
  const onUpdateTask = jest.fn();
  const allPeople = [];
  const props = { task, onSave, onClose, onUpdateTask, allPeople, onOpenPeople: jest.fn(), onCreatePerson: jest.fn() };

  test('renders and allows description edit', () => {
    const { container } = render(<TaskEditor {...props} />);
    const textarea = container.querySelector('textarea.task-description');
    fireEvent.change(textarea, { target: { value: 'new desc' } });
    expect(textarea.value).toBe('new desc');
    // clicking the close icon should save and close
    fireEvent.click(screen.getByTitle('Save & Close'));
    expect(onSave).toHaveBeenCalled();
  });
});
