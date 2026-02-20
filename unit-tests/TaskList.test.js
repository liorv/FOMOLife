import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskList from '../src/TaskList';

// basic smoke tests for inline editor integration

describe('TaskList component', () => {
  const tasks = [{ text: 'task1', done: false, people: [] }];
  const onEditorSave = jest.fn();
  const onEditorUpdate = jest.fn();
  const onEditorClose = jest.fn();
  const allPeople = [];

  test('shows inline editor when editorTaskIdx matches', () => {
    const { container } = render(
      <ul className="item-list">
        <TaskList
          items={tasks}
          type="tasks"
          editorTaskIdx={0}
          setEditorTaskIdx={() => {}}
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
    // the task title should still be visible
    expect(screen.getByText('task1')).toBeTruthy();
    // expand icon should reflect open state
    const icon = container.querySelector('.expand-icon');
    expect(icon).toBeTruthy();
    expect(icon).toHaveClass('open');

  });

  test('clicking a task invokes setEditorTaskIdx and toggles', () => {
    const setIdx = jest.fn();
    render(
      <ul className="item-list">
        <TaskList
          items={tasks}
          type="tasks"
          editorTaskIdx={null}
          setEditorTaskIdx={setIdx}
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

    fireEvent.click(screen.getByText('task1'));
    expect(setIdx).toHaveBeenCalledWith(0);
    // simulate second click should also invoke setter (caller handles toggle logic)
    fireEvent.click(screen.getByText('task1'));
    expect(setIdx).toHaveBeenCalledTimes(2);
  });
});