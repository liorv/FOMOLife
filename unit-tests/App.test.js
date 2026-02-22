import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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
    // wipe whatever backing store the abstraction is using; localStorage is
    // the only client-side store used during jsdom tests.  clearing the
    // file on disk is fine because we backed the original up in global setup.
    localStorage.clear();
    try {
      const { clearData } = require('../src/api/storage');
      await clearData();
    } catch {
      // ignore; the tests will recreate whatever they need
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
    await screen.findByText('first task');
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

    // --- filter behaviour tests ---
    // by default completed tasks are hidden: mark the item done and ensure
    // it disappears from the list
    const checkboxElement = screen.getByRole('checkbox');
    fireEvent.click(checkboxElement);
    // completion toggle is async; wait for filter logic to remove the item
    await waitFor(() => {
      expect(screen.queryByText('first task')).not.toBeInTheDocument();
    });

    // the filter button should be visible next to the search field
    const filterButton = document.querySelector('.filter-icon');
    expect(filterButton).toBeTruthy();

    // open the filter popup and pick the "completed" pill
    fireEvent.click(filterButton);
    let popup = document.querySelector('.filter-popup');
    expect(popup).toBeTruthy();
    // popup is placed within the inner wrapper
    expect(popup.parentElement).toHaveClass('search-inner');
    const pills = popup.querySelectorAll('.filter-pill');
    expect(pills.length).toBe(2);
    // color/identity classes
    expect(pills[0]).toHaveClass('completed');
    expect(pills[1]).toHaveClass('overdue');
    fireEvent.click(pills[0]); // completed
    // completed item should reappear and an active pill shown
    expect(screen.getByText('first task')).toBeInTheDocument();
    let activeEls = document.querySelectorAll('.active-filter');
    expect(activeEls.length).toBe(1);
    expect(activeEls[0].textContent).toContain('Completed');

    // now also select the overdue pill to verify multi-selection works
    fireEvent.click(filterButton);
    popup = document.querySelector('.filter-popup');
    fireEvent.click(popup.querySelectorAll('.filter-pill')[1]); // overdue
    activeEls = document.querySelectorAll('.active-filter');
    expect(activeEls.length).toBe(2);
    // confirm overdue pill exists among active elements
    const overduePill = Array.from(activeEls).find(e => e.textContent.includes('Overdue'));
    expect(overduePill).toBeTruthy();

    // remove completed by clicking its clear icon
    const clearCompleted = activeEls[0].querySelector('.clear-filter');
    fireEvent.click(clearCompleted);
    // leftover should be only overdue
    activeEls = document.querySelectorAll('.active-filter');
    expect(activeEls.length).toBe(1);
    expect(activeEls[0].textContent).toContain('Overdue');

    // clear the overdue pill as well so we can continue with other tests
    const clearOverdue = activeEls[0].querySelector('.clear-filter');
    fireEvent.click(clearOverdue);

    // create a second task and then edit it to assign a past due date
    addTask('past due');
    await screen.findByText('past due');
    // open the editor by clicking the task title
    fireEvent.click(screen.getByText('past due'));
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dueInput = document.querySelector('.due-date-input');
    expect(dueInput).toBeTruthy();
    fireEvent.change(dueInput, { target: { value: past } });
    // wait for React to flush the updated value back into the controlled input
    await waitFor(() => expect(dueInput.value).toBe(past));
    // now save and close via the button inside editor
    const saveBtn = screen.getByTitle('Save & Close');
    fireEvent.click(saveBtn);
    // once the editor closes, the inline task row should show a date
    // element; wait for the DOM to reflect the value we entered above.
    await waitFor(() => {
      expect(document.querySelector('.task-date')).toBeTruthy();
    });
    // now toggle the overdue filter pill
    fireEvent.click(filterButton);
    popup = document.querySelector('.filter-popup');
    const overduePill2 = popup.querySelectorAll('.filter-pill')[1];
    fireEvent.click(overduePill2);
    // the only visible item should be the overdue one (wait for async render)
    await waitFor(() => {
      expect(screen.getByText('past due')).toBeInTheDocument();
    });
    expect(screen.queryByText('first task')).not.toBeInTheDocument();

    // reset filters by clearing any active pill (we'll re‑open the completed
    // view below so that the checkbox is visible when we toggle it again)
    const activePill2 = document.querySelector('.active-filter');
    if (activePill2) {
      const clearBtn2 = activePill2.querySelector('.clear-filter');
      fireEvent.click(clearBtn2);
    }

    // the first task is still marked done, which means it will be hidden again
    // by the default hide-completed logic. show completed items so we can click
    // the checkbox one more time and verify persistence.
    fireEvent.click(filterButton);
    popup = document.querySelector('.filter-popup');
    fireEvent.click(popup.querySelectorAll('.filter-pill')[0]); // completed

    // click the checkbox belonging to "first task" to flip it back to incomplete
    const firstRow2 = Array.from(document.querySelectorAll('.task-row')).find(r => r.textContent.includes('first task'));
    const cb2 = firstRow2.querySelector('input.task-checkbox');
    fireEvent.click(cb2);
    await waitFor(async () => {
      // after unchecking, the task will disappear from the "completed" view,
      // so assert via the database state rather than the DOM element itself
      const allTasks = await require('../src/api/db').getAll('tasks');
      expect(allTasks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: firstId, done: false }),
        ])
      );
    });
    // clear the completed filter so the unapplied item shows again
    const activePill3 = document.querySelector('.active-filter');
    if (activePill3) {
      const clearBtn3 = activePill3.querySelector('.clear-filter');
      fireEvent.click(clearBtn3);
    }

    // star/unstar on the first task only
    const firstRow = Array.from(document.querySelectorAll('.task-row')).find(r => r.textContent.includes('first task'));
    let starButton = firstRow.querySelector('button.star');
    fireEvent.click(starButton);
    // wait for React to update the button attribute
    await waitFor(() => {
      const btn = firstRow.querySelector('button.star');
      expect(btn).toHaveAttribute('aria-label', 'Unstar');
    });

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

    // remove the original "first task" by finding its row explicitly
    const firstRowForDeletion = Array.from(document.querySelectorAll('.task-row')).find(r => r.textContent.includes('first task'));
    if (firstRowForDeletion) {
      const deleteBtn = firstRowForDeletion.querySelector('button.delete');
      fireEvent.click(deleteBtn);
    }
    await waitFor(() => {
      expect(screen.queryByText('first task')).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/Edit Task/)).not.toBeInTheDocument();
    // storage should no longer contain the deleted item (others may remain)
    const afterDelete = await getAll('tasks');
    expect(afterDelete.some(t => t.text === 'first task')).toBe(false);
  });

  test('people management does not corrupt tasks', async () => {
    render(<App />);

    addPerson('Alice');
    await screen.findByText('Alice');
    expect(screen.getByText('Alice')).toBeInTheDocument();
    // persisted person should have an id
    const { getAll } = require('../src/api/db');
    const people = await getAll('people');
    expect(people.length).toBe(1);
    expect(people[0].id).toBeDefined();

    // ensure App forwards userId to db
    // re-render with a fresh instance so the helper targets the correct DOM
    cleanup();
    render(<App userId="u123" />);
    addTask('uid task');
    // wait for the new task to render so the underlying database write has
    // completed before we inspect it
    await screen.findByText('uid task');
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
    // nothing has been written into the default namespace yet, so it should be
    // empty (this guarantees the two spaces are isolated)
    expect(tasksDefault.length).toBe(0);

    // switch back to a default instance so subsequent interactions use the
    // normal namespace again
    cleanup();
    render(<App />);

    fireEvent.click(screen.getByText('Tasks'));
    addTask('task two');
    await screen.findByText('task two');
    expect(screen.getByText('task two')).toBeInTheDocument();
    const dbAgain = require('../src/api/db');
    const tasksAfter = await dbAgain.getAll('tasks');
    expect(tasksAfter.length).toBe(1);
    expect(tasksAfter[0].id).toBeDefined();

    // switch to People tab and verify header label updated
    fireEvent.click(screen.getByText('People'));
    const headerMethods = document.querySelector('.task-person-list-header .methods');
    expect(headerMethods.textContent).toBe('Notifications');
    // delete the person
    const removeBtn = screen.getByLabelText('Delete person');
    fireEvent.click(removeBtn);
    await waitFor(() => {
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });

    // ensure tasks still there
    fireEvent.click(screen.getByText('Tasks'));
    expect(screen.getByText('task two')).toBeInTheDocument();
  });
});
