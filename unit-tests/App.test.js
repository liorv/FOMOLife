import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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

  test('clicking edit enters project editing mode with title and back button', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Projects'));
    addProject('EditMe');
    await screen.findByText('EditMe');
    const tile = screen.getByText('EditMe').closest('.project-tile');
    expect(tile).toBeTruthy();

    // open editor mode
    fireEvent.click(tile.querySelector('.edit-icon'));

    // logo remains visible and title shown in the center
    expect(screen.getByAltText('FOMO logo')).toBeInTheDocument();
    expect(screen.getByText('EditMe')).toHaveClass('bar-title');
    // project editor container should appear with no pre‑existing subprojects
    const editor = document.querySelector('.project-editor');
    expect(editor).toBeInTheDocument();
    const subInputs = editor.querySelectorAll('.subproject-name-input');
    expect(subInputs.length).toBe(0);
    // bottom bar should still be present and show subproject placeholder
    const bottom = document.querySelector('.bottom-input-bar');
    expect(bottom).toBeTruthy();
    expect(bottom.querySelector('input').placeholder).toMatch(/subproject/);

    // back button should be available and return to normal view
    const backBtn = screen.getByTitle('Back');
    expect(backBtn).toBeInTheDocument();
    expect(backBtn).toHaveClass('back-circle');
    fireEvent.click(backBtn);
    // after pressing back bar logo should reappear and add bar returns
    expect(screen.getByAltText('FOMO logo')).toBeInTheDocument();
    const bottomAfter = document.querySelector('.bottom-input-bar');
    expect(bottomAfter.querySelector('.add-bar')).toBeTruthy();
    // bar placeholder should reflect current type (projects by default)
    expect(bottomAfter.querySelector('input').placeholder).toMatch(/project/);
    // project tile still visible and editor gone
    expect(screen.getByText('EditMe')).toBeInTheDocument();
    expect(screen.queryByLabelText('Project Name')).toBeNull();
  });

  test('can add subprojects and tasks inside editor', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Projects'));
    addProject('E');
    await screen.findByText('E');
    const tile = screen.getByText('E').closest('.project-tile');
    fireEvent.click(tile.querySelector('.edit-icon'));

    // no subprojects initially
    expect(
      document.querySelectorAll('.project-editor .subproject-name-input').length,
    ).toBe(0);

    // use the global bottom bar while editing
    const bottomBar = document.querySelector('.bottom-input-bar');
    expect(bottomBar).toBeTruthy();
    const subAddInput = bottomBar.querySelector('.add-bar input');
    fireEvent.change(subAddInput, { target: { value: 'Sub1' } });
    fireEvent.keyDown(subAddInput, { key: 'Enter', code: 'Enter' });

    let summaryInputs =
      document.querySelectorAll('.project-editor .subproject-name-input');
    expect(summaryInputs.length).toBe(1);
    expect(summaryInputs[0].value).toBe('Sub1');
    // bar cleared after add
    expect(bottomBar.querySelector('.add-bar input').value).toBe('');

    // add a second subproject via button click
    fireEvent.change(bottomBar.querySelector('.add-bar input'), {
      target: { value: 'Sub2' },
    });
    fireEvent.click(bottomBar.querySelector('.add-bar .add-btn'));
    summaryInputs =
      document.querySelectorAll('.project-editor .subproject-name-input');
    expect(summaryInputs.length).toBe(2);
    expect(summaryInputs[1].value).toBe('Sub2');

    // clicking the add-task button should insert a TaskRow
    const addTaskBtn = document.querySelector(
      '.project-editor .add-task-btn',
    );
    expect(addTaskBtn).toBeInTheDocument();
    fireEvent.click(addTaskBtn);
    // a new task-row should now exist inside editor
    let taskRow = document.querySelector(
      '.project-editor .task-row',
    );
    expect(taskRow).toBeInTheDocument();
    // delete the subproject using inline button and ensure it vanishes
    const deleteBtn = document.querySelector('.project-editor .delete-subproj-inline');
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);
    expect(document.querySelector('.project-editor .subproject-name-input')).toBeNull();
    // open the inline editor and change the task name
    const expandIcon = taskRow.querySelector('.expand-icon');
    fireEvent.click(expandIcon);
    let inlineEditor = document.querySelector('.inline-editor');
    expect(inlineEditor).toBeInTheDocument();
    const titleInput = inlineEditor.querySelector('.task-title-input');
    fireEvent.change(titleInput, { target: { value: 'Renamed' } });
    // notification add-bar should be available
    expect(inlineEditor.querySelector('.add-person-bar input')).toBeInTheDocument();
    const saveBtn = inlineEditor.querySelector('button.editor-close-btn');
    expect(saveBtn).toBeInTheDocument();
    fireEvent.click(saveBtn);
    // ensure the row title updated
    expect(taskRow.querySelector('.task-title').textContent).toBe('Renamed');
    // click expand icon again to confirm it toggles off
    fireEvent.click(expandIcon);
    expect(document.querySelector('.inline-editor')).toBeNull();

    // collapse the subproject using the collapse button and ensure tasks hide
    const collapseBtn = document.querySelector('.project-editor .collapse-btn');
    expect(collapseBtn).toBeInTheDocument();
    fireEvent.click(collapseBtn);
    expect(document.querySelector('.project-editor .task-row')).toBeNull();

    // expand again and verify row still exists
    fireEvent.click(collapseBtn);
    taskRow = document.querySelector('.project-editor .task-row');
    expect(taskRow).toBeInTheDocument();
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
