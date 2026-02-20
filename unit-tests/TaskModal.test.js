import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskEditor from '../src/TaskModal';

describe('TaskEditor component', () => {
  const task = { text: 'foo', description: '', people: [] };
  const onSave = jest.fn();
  const onClose = jest.fn();
  const onUpdateTask = jest.fn();
  const allPeople = [];
  const shared = { task, onSave, onClose, onUpdateTask, allPeople, onOpenPeople: jest.fn(), onCreatePerson: jest.fn() };

  test('renders and allows description edit in default (side) mode', () => {
    const { container } = render(<TaskEditor {...shared} />);
    const textarea = container.querySelector('textarea.task-description');
    fireEvent.change(textarea, { target: { value: 'new desc' } });
    expect(textarea.value).toBe('new desc');
    // container should have side-editor class by default
    expect(container.querySelector('.side-editor')).toBeTruthy();
    // clicking the close icon should save and close
    fireEvent.click(screen.getByTitle('Save & Close'));
    expect(onSave).toHaveBeenCalled();
  });

  test('inline mode adds appropriate class and still works', () => {
    const { container } = render(<TaskEditor {...shared} inline={true} />);
    expect(container.querySelector('.inline-editor')).toBeTruthy();
    // should not render the old side-panel class
    expect(container.querySelector('.side-editor')).toBeFalsy();
    // header should be the compact inline style
    expect(container.querySelector('.inline-header')).toBeTruthy();
    const textarea = container.querySelector('textarea.task-description');
    fireEvent.change(textarea, { target: { value: 'inline desc' } });
    expect(textarea.value).toBe('inline desc');
  });
});
