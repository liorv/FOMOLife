import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import App from '../src/App';
import { PROJECT_COLORS } from '../src/components/ProjectTile';

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

function addProject(name) {
  fireEvent.click(screen.getByText('Projects'));
  const input = document.querySelector('.bottom-input-bar .add-bar input');
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
    // when the app loads on the tasks tab the container should gain
    // our padding helper class so content isn't flush against the edges
    const container = document.querySelector('.container');
    expect(container).toHaveClass('tasks-padding');
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
    // the padding helper class should be removed when leaving tasks
    expect(container).not.toHaveClass('tasks-padding');
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

    // click the task name to open inline editor and immediately begin editing
    fireEvent.click(screen.getByText('first task'));
    // inline editor should appear immediately beneath the task row
    const editor = document.querySelector('.inline-editor');
    expect(editor).toBeTruthy();
    // title input should already be focused for editing
    let rowInput = document.querySelector('input.task-title-input');
    expect(rowInput).toBeTruthy();
    fireEvent.change(rowInput, { target: { value: 'first updated' } });
    fireEvent.keyDown(rowInput, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(screen.getByText('first updated')).toBeInTheDocument();
    });
    const icon = document.querySelector('.expand-icon');
    expect(icon).toHaveClass('open');
    const afterIcon = icon.nextSibling;
    expect(afterIcon.className).toContain('task-checkbox');
    const titleElem = afterIcon.nextSibling;
    expect(titleElem.className).toContain('task-title');

    // click expand icon again to collapse
    fireEvent.click(document.querySelector('.expand-icon'));
    expect(document.querySelector('.inline-editor')).toBeNull();
    expect(document.querySelector('.expand-icon')).not.toHaveClass('open');

    // wait for database record to include updated name
    await waitFor(async () => {
      const all = await getAll('tasks');
      expect(all.some(t => t.text === 'first updated')).toBe(true);
    });

    // delete row regardless of displayed text
    const firstRowForDeletion = Array.from(document.querySelectorAll('.task-row')).find(r => r.textContent.includes('first task') || r.textContent.includes('first updated'));
    if (firstRowForDeletion) {
      const deleteBtn = firstRowForDeletion.querySelector('button.delete');
      fireEvent.click(deleteBtn);
    }
    await waitFor(() => {
      expect(screen.queryByText(/first task|first updated/)).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/Edit Task/)).not.toBeInTheDocument();
    const afterDelete = await getAll('tasks');
    expect(afterDelete.every(t => t.text !== 'first task' && t.text !== 'first updated')).toBe(true);
  });

  test('project tab shows tile with name, color and progress', async () => {
    render(<App />);

    // switch to projects
    fireEvent.click(screen.getByText('Projects'));
    addProject('Build rockets');
    // expect tile appears
    await screen.findByText('Build rockets');
    const tile = screen.getByText('Build rockets').closest('.project-tile');
    expect(tile).toBeTruthy();

    // should persist project with color and progress fields
    const { getAll } = require('../src/api/db');
    const projects = await getAll('projects');
    expect(projects.length).toBe(1);
    expect(projects[0].text).toBe('Build rockets');
    expect(typeof projects[0].progress).toBe('number');
    expect(projects[0].progress).toBeGreaterThanOrEqual(30);
    expect(projects[0].progress).toBeLessThanOrEqual(70);
    // color may be null (generated later) but should exist as a key
    expect('color' in projects[0]).toBe(true);
    expect(typeof projects[0].color).toBe('string');
    expect(projects[0].color).toMatch(/^#[0-9a-fA-F]{6}$/);
    // first project should take the first color in the list
    expect(projects[0].color).toBe(PROJECT_COLORS[0]);

    // add second project and verify color rotates
    addProject('Second project');
    await screen.findByText('Second project');
    const projects2 = await getAll('projects');
    expect(projects2.length).toBe(2);
    expect(projects2[1].color).toBe(PROJECT_COLORS[1]);

    // check that progress bar exists in DOM and style has percentage
    const progressEl = tile.querySelector('.project-progress');
    expect(progressEl).toBeTruthy();
    expect(progressEl.style.width).toMatch(/\d+%/);

    // icons
    expect(tile.querySelector('.edit-icon')).toBeTruthy();
    expect(tile.querySelector('.delete-icon')).toBeTruthy();
  });

  test('tasks can be reordered via drag and drop', async () => {
    render(<App />);
    // add two tasks and verify initial order
    addTask('first');
    addTask('second');
    await screen.findByText('second');
    const rowsBefore = document.querySelectorAll('.task-row');
    expect(rowsBefore[0].textContent).toContain('first');
    expect(rowsBefore[1].textContent).toContain('second');

    // simulate dragging the first row onto the second
    const sourceRow = rowsBefore[0];
    fireEvent.dragStart(sourceRow);
    const targetRow = rowsBefore[1];
    fireEvent.dragOver(targetRow);
    fireEvent.drop(targetRow);

    // after drop, order should update; wait until the first row text flips
    await waitFor(() => {
      const rowsAfter = document.querySelectorAll('.task-row');
      expect(rowsAfter[0].textContent).toContain('second');
      expect(rowsAfter[1].textContent).toContain('first');
    });
  });

  test('clicking edit enters project editing mode with title and back button', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Projects'));
    addProject('EditMe');
    await screen.findByText('EditMe');
    const tile = screen.getByText('EditMe').closest('.project-tile');
    expect(tile).toBeTruthy();

    // open editor mode
    fireEvent.click(tile.querySelector('.edit-icon'));

    // while editing a project the logo remains visible with the title
    expect(screen.getByAltText('FOMO logo')).toBeInTheDocument();
    let titleEl = screen.getByText('EditMe');
    // the text lives in an inner span with class 'bar-title-text'
    expect(titleEl).toHaveClass('bar-title-text');
    // clicking the title should activate inline edit
    fireEvent.click(titleEl);
    const titleInput = document.querySelector('.bar-title-input');
    expect(titleInput).toBeInTheDocument();
    fireEvent.change(titleInput, { target: { value: 'Renamed' } });
    fireEvent.keyDown(titleInput, { key: 'Enter', code: 'Enter' });
    // verify title updated in UI (may happen asynchronously)
    await waitFor(() => {
      expect(screen.getByText('Renamed')).toHaveClass('bar-title-text');
    });
    // project editor container should appear with no pre‑existing subprojects
    const editor = document.querySelector('.project-editor');
    expect(editor).toBeInTheDocument();
    // expanded editor no longer renders name inputs
    const subInputs = editor.querySelectorAll('.subproject-name-input');
    expect(subInputs.length).toBe(0);
    // once the project editor is shown the global bottom bar is removed
    expect(document.querySelector('.bottom-input-bar')).toBeNull();
    // the editor itself provides a FAB for adding subprojects
    const fab = document.querySelector('.project-editor > .fab:not(.fab-small)');
    expect(fab).toBeInTheDocument();

    // create an unnamed subproject via FAB and ensure it appears (may update async)
    fireEvent.click(fab);
    const manualBtn = document.querySelector('.fab-small[title="Add manual subproject"]');
    // menu buttons should not be fixed to the viewport
    expect(window.getComputedStyle(manualBtn).position).not.toBe('fixed');
    // label visible on manual button
    expect(manualBtn.textContent).toContain('Add subproject');
    const aiBtn = document.querySelector('.fab-small[title="AI assisted subproject"]');
    expect(aiBtn.textContent).toContain('AI assisted project design');
    fireEvent.click(manualBtn);
    await waitFor(() => {
      // new subproject may render expanded or collapsed; accept either selector
      const subs = document.querySelectorAll(
        '.project-editor .subproject, .project-editor .subproject-row'
      );
      expect(subs.length).toBe(1);
      const sub = subs[0];
      // whichever view, the title should start empty
      const titleSpan = sub.querySelector(
        '.subproject-row-title span, .subproject-name-display'
      );
      expect(titleSpan).toBeTruthy();
      expect(titleSpan.textContent).toBe('');
    });
    // clicking fab again shouldn't add another unnamed
    fireEvent.click(fab);
    await waitFor(() => {
      const subs = document.querySelectorAll(
        '.project-editor .subproject, .project-editor .subproject-row'
      );
      expect(subs.length).toBe(1);
    });

    // the title bar should display a close icon button on the right
    const closeBtn = screen.getByTitle('Close');
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.textContent).toBe('close');
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    // after pressing done bar logo should reappear
    expect(screen.getByAltText('FOMO logo')).toBeInTheDocument();
    await waitFor(() => {
      const bottomAfter = document.querySelector('.bottom-input-bar');
      expect(bottomAfter.querySelector('.add-bar')).toBeTruthy();
      // bar placeholder should reflect current type (projects by default)
      expect(bottomAfter.querySelector('input').placeholder).toMatch(/project/);
    });
    // project tile still visible and editor gone
    expect(screen.getByText('Renamed')).toBeInTheDocument();
    expect(screen.queryByLabelText('Project Name')).toBeNull();

    // re-open editor and verify unnamed subproject was removed
    const tile2 = screen.getByText('Renamed').closest('.project-tile');
    fireEvent.click(tile2.querySelector('.edit-icon'));
    const rowsAfter = document.querySelectorAll('.project-editor .subproject-row');
    expect(rowsAfter.length).toBe(0);
  });

  test.skip('subproject tasks may be reordered while editing a project', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Projects'));
    addProject('ReorderTest');
    await screen.findByText('ReorderTest');
    const tile = screen.getByText('ReorderTest').closest('.project-tile');
    fireEvent.click(tile.querySelector('.edit-icon'));

    // add a subproject and two tasks programmatically via state update
    const input = document.querySelector('.project-editor .subproject-name-input');
    // there should be at least one subproject input after adding
    if (!input) {
      const fab = document.querySelector('.project-editor > .fab:not(.fab-small)');
      fireEvent.click(fab);
      const manual = document.querySelector('.fab-small[title="Add manual subproject"]');
      fireEvent.click(manual);
      await waitFor(() => {
        expect(document.querySelectorAll('.project-editor .subproject-name-input').length).toBe(1);
      });
    }
    // now add two tasks to visible subproject
    const taskInput = document.querySelector('.project-editor .new-task-input');
    fireEvent.change(taskInput, { target: { value: 'one' } });
    fireEvent.keyDown(taskInput, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(document.querySelectorAll('.project-editor .task-row').length).toBe(1);
    });
    fireEvent.change(taskInput, { target: { value: 'two' } });
    fireEvent.keyDown(taskInput, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(document.querySelectorAll('.project-editor .task-row').length).toBe(2);
    });

    const rows = document.querySelectorAll('.project-editor .task-row');
    expect(rows[0].textContent).toContain('one');
    expect(rows[1].textContent).toContain('two');

    // simulate drag to reorder same as previous tests
    fireEvent.dragStart(rows[0]);
    fireEvent.dragOver(rows[1]);
    fireEvent.drop(rows[1]);

    await waitFor(() => {
      const after = document.querySelectorAll('.project-editor .task-row');
      expect(after[0].textContent).toContain('two');
      expect(after[1].textContent).toContain('one');
    });
  });

  test('deleting a project shows confirmation modal and removes when confirmed', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Projects'));
    addProject('DeleteMe');
    const tile = await screen.findByText('DeleteMe');
    const projectTile = tile.closest('.project-tile');

    // open confirm dialog
    fireEvent.click(projectTile.querySelector('.delete-icon'));
    const modal = document.querySelector('.confirm-modal');
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('Are you sure you want to delete this project');
    // confirm via button
    const deleteBtn = modal.querySelector('.confirm-btn');
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(screen.queryByText('DeleteMe')).not.toBeInTheDocument();
    });
    const { getAll } = require('../src/api/db');
    const projects = await getAll('projects');
    expect(projects.some(p => p.text === 'DeleteMe')).toBe(false);
  });

  test('cancelling project deletion leaves item intact', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Projects'));
    addProject('KeepMe');
    const tile = await screen.findByText('KeepMe');
    const projectTile = tile.closest('.project-tile');

    // open modal and cancel
    fireEvent.click(projectTile.querySelector('.delete-icon'));
    const modal = document.querySelector('.confirm-modal');
    expect(modal).toBeTruthy();
    const cancelBtn = modal.querySelector('.cancel-btn');
    fireEvent.click(cancelBtn);
    expect(screen.getByText('KeepMe')).toBeInTheDocument();
    const { getAll } = require('../src/api/db');
    const projects = await getAll('projects');
    expect(projects.some(p => p.text === 'KeepMe')).toBe(true);
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
