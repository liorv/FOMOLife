import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskEditor from '../src/components/TaskModal';

describe('TaskEditor component', () => {
  const task = { text: 'foo', description: '', dueDate: '', people: [] };
  const onSave = jest.fn();
  const onClose = jest.fn();
  const onUpdateTask = jest.fn();
  const allPeople = [];
  const shared = { task, onSave, onClose, onUpdateTask, allPeople, onOpenPeople: jest.fn(), onCreatePerson: jest.fn() };

  test('renders and allows description and date edit in default (side) mode', () => {
    const { container } = render(<TaskEditor {...shared} />);
    // verify layout columns exist
    expect(container.querySelector('.editor-columns .left-column')).toBeTruthy();
    expect(container.querySelector('.editor-columns .right-column')).toBeTruthy();
    // header text should now be the simplified label
    expect(container.querySelector('.task-person-list-header .methods').textContent).toBe('Notifications');
    // section label should reflect new terminology
    expect(container.querySelector('.people-section label').textContent).toBe('Owners');

    const textarea = container.querySelector('textarea.task-description');
    fireEvent.change(textarea, { target: { value: 'new notes' } });
    expect(textarea.value).toBe('new notes');

    const dateInput = container.querySelector('input[type="date"]');
    expect(dateInput).toBeTruthy();
    fireEvent.change(dateInput, { target: { value: '2025-12-31' } });
    expect(dateInput.value).toBe('2025-12-31');

    // container should have side-editor class by default
    const side = container.querySelector('.side-editor');
    expect(side).toBeTruthy();
    // inline style ensures scrolling when content is tall
    expect(side.style.overflow).toBe('auto');
    // clicking the close icon should save and close
    fireEvent.click(screen.getByTitle('Save & Close'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ text: 'foo', dueDate: '2025-12-31', description: 'new notes' }));
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

    const textarea = container.querySelector('textarea.task-description');
    fireEvent.change(textarea, { target: { value: 'inline notes' } });
    expect(textarea.value).toBe('inline notes');
    // due date input should still be present
    const dateInput = container.querySelector('input[type="date"]');
    expect(dateInput).toBeTruthy();
  });

  test('notes label is associated with textarea', () => {
    const { container } = render(<TaskEditor {...shared} />);
    const label = container.querySelector('label[for="task-desc"]');
    const textarea = container.querySelector('#task-desc');
    expect(label).toBeTruthy();
    expect(textarea).toBeTruthy();
    expect(label.getAttribute('for')).toBe('task-desc');
    expect(label.textContent).toBe('Notes');
  });

  test('due date label links to date input', () => {
    const { container } = render(<TaskEditor {...shared} />);
    const label = container.querySelector('label[for="task-date"]');
    const dateInput = container.querySelector('#task-date');
    expect(label).toBeTruthy();
    expect(dateInput).toBeTruthy();
    expect(label.getAttribute('for')).toBe('task-date');
  });


});
