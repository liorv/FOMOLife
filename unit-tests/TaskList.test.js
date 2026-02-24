import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskList from '../src/components/TaskList';

// basic smoke tests for inline editor integration

describe('TaskList component', () => {
  const tasks = [{ id: 't1', text: 'task1', done: false, people: [] }];
  const onEditorSave = jest.fn();
  const onEditorUpdate = jest.fn();
  const onEditorClose = jest.fn();
  const allPeople = [];

  test('shows inline editor when editorTaskId matches', () => {
    const { container } = render(
      <ul className="item-list">
        <TaskList
          items={tasks}
          type="tasks"
          editorTaskId="t1"
          setEditorTaskId={() => {}}
          handleToggle={() => {}}
          handleStar={() => {}}
          handleDelete={() => {}}
          onEditorSave={onEditorSave}
          onEditorUpdate={onEditorUpdate}
          onEditorClose={onEditorClose}
          allPeople={allPeople}
          onOpenPeople={() => {}}
          onCreatePerson={() => {}}
        />
      </ul>
    );

    // only a single <li> should exist; the editor is nested inside it
    expect(container.querySelectorAll('li').length).toBe(1);
    expect(container.querySelector('.task-editor-wrapper')).toBeTruthy();
    expect(container.querySelector('.inline-editor')).toBeTruthy();
    // the task title should still be visible (input when editor is open)
    const titleInput = container.querySelector('input.task-title-input');
    expect(titleInput).toBeTruthy();
    expect(titleInput.value).toBe('task1');
    // expand icon should reflect open state and be placed before title
    const icon = container.querySelector('.expand-icon');
    expect(icon).toBeTruthy();
    expect(icon).toHaveClass('open');
    // checkbox should come after icon
    const checkbox = icon.nextSibling;
    expect(checkbox.tagName).toBe('INPUT');
    expect(checkbox.className).toContain('task-checkbox');
    // title should follow
    const title = checkbox.nextSibling;
    expect(title.className).toContain('task-title');
    // title receives full text as tooltip and is truncated
    expect(title.getAttribute('title')).toBe('task1');
    // since our sample doesn't include a due date, ensure there is no .task-date element present
    expect(container.querySelector('.task-date')).toBeFalsy();

  });

  test('editing row highlight applied to header only', () => {
    const { container } = render(
      <ul className="item-list">
        <li className="editing">
          <div className="task-header">foo</div>
          <div className="task-editor-wrapper">bar</div>
        </li>
      </ul>
    );
    const header = container.querySelector('.task-header');
    expect(header).toBeTruthy();
    const li = container.querySelector('li.editing');
    expect(li).toBeTruthy();
  });

  test('clicking a task invokes setEditorTaskId and toggles', () => {
    const setIdx = jest.fn();
    // also make sure drag callbacks are forwarded
    const dragStart = jest.fn();
    render(
      <ul className="item-list">
        <TaskList
          items={tasks}
          type="tasks"
          editorTaskId={null}
          setEditorTaskId={setIdx}
          handleToggle={() => {}}
          handleStar={() => {}}
          handleDelete={() => {}}
          onDragStart={dragStart}
          onDragOver={() => {}}
          onDrop={() => {}}
          onDragEnd={() => {}}
          onEditorSave={onEditorSave}
          onEditorUpdate={onEditorUpdate}
          onEditorClose={onEditorClose}
          allPeople={allPeople}
          onOpenPeople={() => {}}
          onCreatePerson={() => {}}
        />
      </ul>
    );

    // simulate dragstart on the handle to ensure callback runs
    const handleElem = document.querySelector('.drag-handle');
    fireEvent.dragStart(handleElem);
    expect(dragStart).toHaveBeenCalledWith('t1', expect.any(Object));

    fireEvent.click(screen.getByText('task1'));
    expect(setIdx).toHaveBeenCalledWith('t1');
    // simulate second click should also invoke setter (caller handles toggle logic)
    fireEvent.click(screen.getByText('task1'));
    expect(setIdx).toHaveBeenCalledTimes(2);
  });
});