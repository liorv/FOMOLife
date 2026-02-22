import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App';

// helpers
function addTask(text) {
  // target the add-bar input located in the bottom-input-bar
  const input = document.querySelector('.bottom-input-bar .add-bar input');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
}

function addPerson(name) {
  fireEvent.click(screen.getByText('People'));
  // the add-bar now lives in the bottom-input-bar regardless of active tab
  const input = document.querySelector('.bottom-input-bar .add-bar input') || screen.getByPlaceholderText(/Add a new person/);
  fireEvent.change(input, { target: { value: name } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
}

describe('App component', () => {
  beforeEach(async () => {
    // wipe whatever backing store the abstraction is using
    localStorage.clear();
    try {
      // import here so the module doesn't run before jest sets up jsdom
      const { clearData } = require('../src/api/storage');
      await clearData();
    } catch {
      // ignore if something goes wrong; localStorage is the main thing
    }
  });

  test('task CRUD and editor synchronization', async () => {
    render(<App />);

    // AddBar should be present in the bottom-input-bar container
    const bottom = document.querySelector('.bottom-input-bar');
    expect(bottom).toBeTruthy();
    const input = bottom.querySelector('.add-bar input');
    expect(bottom.querySelector('.add-bar')).toBeTruthy();
    // input exists; actual width behaviour is enforced by CSS loaded in the
    // browser environment, not jsdom used for tests.
    // title bar with logo should exist above content
    const title = document.querySelector('.title-bar');
    expect(title).toBeTruthy();
    expect(title.querySelector('img.title-logo')).toBeTruthy();
    // search input should be available in the title bar
    const searchInput = title.querySelector('input.title-search');
    expect(searchInput).toBeTruthy();
    // search icon should also be visible
    expect(document.querySelector('.search-icon')).toBeTruthy();
    // typing into the search should filter tasks
    fireEvent.change(searchInput, { target: { value: 'first' } });
    // nothing to assert yet until a task is added below

    // add a task
    addTask('first task');
    expect(screen.getByText('first task')).toBeInTheDocument();
    // if search input contains a non-matching string the task disappears
    fireEvent.change(searchInput, { target: { value: 'nomatch' } });
    expect(screen.queryByText('first task')).not.toBeInTheDocument();
    // clearing or setting to a matching query shows it again
    fireEvent.change(searchInput, { target: { value: 'first' } });
    expect(screen.getByText('first task')).toBeInTheDocument();

    // switch to people view; search field should hide and query resets
    fireEvent.click(screen.getByText('People'));
    expect(document.querySelector('.title-search')).toBeNull();
    // back to tasks should restore it, but it should be cleared
    fireEvent.click(screen.getByText('Tasks'));
    const reinput = document.querySelector('.title-search');
    expect(reinput).toBeTruthy();
    expect(reinput.value).toBe('');

    // the item should have been persisted with a generated id
    const { getAll } = require('../src/api/db');
    const saved = await getAll('tasks');
    expect(saved.length).toBe(1);
    expect(saved[0].id).toBeDefined();
    const firstId = saved[0].id;

    // toggle completion
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText('first task').closest('li')).toHaveClass('done');
    // make sure persistence still has same id and done flag
    const afterToggle = await getAll('tasks');
    expect(afterToggle[0].id).toBe(firstId);
    expect(afterToggle[0].done).toBe(true);

    // star/unstar
    let starButton = screen.getByLabelText('Star');
    fireEvent.click(starButton);
    expect(starButton).toHaveAttribute('aria-label', 'Unstar');

    // open editor and then delete task
    fireEvent.click(screen.getByText('first task'));
    // inline editor should appear immediately beneath the task row
    const editor = document.querySelector('.inline-editor');
    expect(editor).toBeTruthy();
    // editor should not render its own title text
    expect(editor.textContent).not.toContain('first task');
    const textarea = editor.querySelector('textarea.task-description');
    // style rules for width are in CSS, not inline; we just ensure the textarea exists
    expect(textarea).toBeTruthy();
    const icon = document.querySelector('.expand-icon');
    expect(icon).toHaveClass('open');
    const afterIcon = icon.nextSibling;
    expect(afterIcon.className).toContain('task-checkbox');
    const titleElem = afterIcon.nextSibling;
    expect(titleElem.className).toContain('task-title');

    // click the expand icon again to collapse (title is now an input)
    fireEvent.click(document.querySelector('.expand-icon'));
    expect(document.querySelector('.inline-editor')).toBeNull();
    expect(document.querySelector('.expand-icon')).not.toHaveClass('open');

    const deleteButtons = screen.getAllByLabelText('Delete');
    // the first delete button belongs to the task
    fireEvent.click(deleteButtons[0]);
    expect(screen.queryByText('first task')).not.toBeInTheDocument();
    expect(screen.queryByText(/Edit Task/)).not.toBeInTheDocument();
    const afterDelete = await getAll('tasks');
    expect(afterDelete).toEqual([]);
  });

  test('people management does not corrupt tasks', async () => {
    render(<App />);

    addPerson('Alice');
    expect(screen.getByText('Alice')).toBeInTheDocument();
    // persisted person should have an id
    const { getAll } = require('../src/api/db');
    const people = await getAll('people');
    expect(people.length).toBe(1);
    expect(people[0].id).toBeDefined();

    // ensure App forwards userId to db
    const userApp = render(<App userId="u123" />);
    addTask('uid task');
    const db2 = require('../src/api/db');
    const uTasks = await db2.getAll('tasks', 'u123');
    expect(uTasks.some(t => t.text === 'uid task')).toBe(true);

    // bottom bar should still exist for adding people
    const bottom = document.querySelector('.bottom-input-bar');
    expect(bottom.querySelector('.add-bar')).toBeTruthy();

    // verify namespacing works when we render with a userId
    const db = require('../src/api/db');
    const { getAll: getAllNamespaced } = db;
    const otherUser = 'other';
    // add a task as a different user directly via API
    await db.create('tasks', { text: 'foo' }, otherUser);
    const tasksOther = await getAllNamespaced('tasks', otherUser);
    expect(tasksOther.length).toBe(1);
    const tasksDefault = await getAllNamespaced('tasks');
    expect(tasksDefault.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByText('Tasks'));
    addTask('task two');
    expect(screen.getByText('task two')).toBeInTheDocument();
    const { getAll } = require('../src/api/db');
    const tasksAfter = await getAll('tasks');
    expect(tasksAfter.length).toBe(1);
    expect(tasksAfter[0].id).toBeDefined();

    // switch to People tab and verify header label updated
    fireEvent.click(screen.getByText('People'));
    const headerMethods = document.querySelector('.task-person-list-header .methods');
    expect(headerMethods.textContent).toBe('Notifications');
    // delete the person
    const removeBtn = screen.getByLabelText('Delete person');
    fireEvent.click(removeBtn);
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();

    // ensure tasks still there
    fireEvent.click(screen.getByText('Tasks'));
    expect(screen.getByText('task two')).toBeInTheDocument();
  });
});
