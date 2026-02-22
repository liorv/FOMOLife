import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskEditor from '../src/TaskModal';

describe('TaskEditor component', () => {
  const task = { text: 'foo', description: '', dueDate: '', people: [] };
  const onSave = jest.fn();
  const onClose = jest.fn();
  const onUpdateTask = jest.fn();
  const allPeople = [];
  const shared = { task, onSave, onClose, onUpdateTask, allPeople, onOpenPeople: jest.fn(), onCreatePerson: jest.fn() };

  test('renders and allows title, description and date edit in default (side) mode', () => {
    const { container } = render(<TaskEditor {...shared} />);
    // verify layout columns exist
    expect(container.querySelector('.editor-columns .left-column')).toBeTruthy();
    expect(container.querySelector('.editor-columns .right-column')).toBeTruthy();
    // header text should reflect notification question
    expect(container.querySelector('.task-person-list-header .methods').textContent).toBe('How do you want to notify them?');

    const titleInput = container.querySelector('input#task-title');
    expect(titleInput).toBeTruthy();
    expect(titleInput.value).toBe('foo');
    fireEvent.change(titleInput, { target: { value: 'bar' } });
    expect(titleInput.value).toBe('bar');

    const textarea = container.querySelector('textarea.task-description');
    fireEvent.change(textarea, { target: { value: 'new desc' } });
    expect(textarea.value).toBe('new desc');

    const dateInput = container.querySelector('input[type="date"]');
    expect(dateInput).toBeTruthy();
    fireEvent.change(dateInput, { target: { value: '2025-12-31' } });
    expect(dateInput.value).toBe('2025-12-31');

    // container should have side-editor class by default
    expect(container.querySelector('.side-editor')).toBeTruthy();
    // clicking the close icon should save and close
    fireEvent.click(screen.getByTitle('Save & Close'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ text: 'bar', dueDate: '2025-12-31', description: 'new desc' }));
  });

  test('inline mode adds appropriate class and still works', () => {
    const { container } = render(<TaskEditor {...shared} inline={true} />);
    expect(container.querySelector('.inline-editor')).toBeTruthy();
    // should not render the old side-panel class
    expect(container.querySelector('.side-editor')).toBeFalsy();
    // inline editor should not include its own heading text
    expect(container.textContent).not.toContain('Edit Task');

    const editorCols = container.querySelector('.inline-editor .editor-columns');
    expect(editorCols).toBeTruthy();
    const left = editorCols.querySelector('.left-column');
    const right = editorCols.querySelector('.right-column');
    expect(left).toBeTruthy();
    expect(right).toBeTruthy();
    // ensure they are siblings (side-by-side)
    expect(left.nextSibling).toBe(right);

    const titleInput = container.querySelector('input#task-title');
    expect(titleInput).toBeTruthy();
    expect(titleInput.value).toBe('foo');

    const textarea = container.querySelector('textarea.task-description');
    fireEvent.change(textarea, { target: { value: 'inline desc' } });
    expect(textarea.value).toBe('inline desc');
    // due date input should still be present
    const dateInput = container.querySelector('input[type="date"]');
    expect(dateInput).toBeTruthy();
  });

  test('description label is associated with textarea', () => {
    const { container } = render(<TaskEditor {...shared} />);
    const label = container.querySelector('label[for="task-desc"]');
    const textarea = container.querySelector('#task-desc');
    expect(label).toBeTruthy();
    expect(textarea).toBeTruthy();
    expect(label.getAttribute('for')).toBe('task-desc');
  });

  test('due date label links to date input', () => {
    const { container } = render(<TaskEditor {...shared} />);
    const label = container.querySelector('label[for="task-date"]');
    const dateInput = container.querySelector('#task-date');
    expect(label).toBeTruthy();
    expect(dateInput).toBeTruthy();
    expect(label.getAttribute('for')).toBe('task-date');
  });

  test('title label links to title input', () => {
    const { container } = render(<TaskEditor {...shared} />);
    const label = container.querySelector('label[for="task-title"]');
    const input = container.querySelector('#task-title');
    expect(label).toBeTruthy();
    expect(input).toBeTruthy();
    expect(label.getAttribute('for')).toBe('task-title');
  });
});
