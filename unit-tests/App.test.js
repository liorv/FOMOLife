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
  beforeEach(() => {
    localStorage.clear();
  });

  test('task CRUD and editor synchronization', () => {
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

    // add a task
    addTask('first task');
    expect(screen.getByText('first task')).toBeInTheDocument();

    // toggle completion
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText('first task').closest('li')).toHaveClass('done');

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
  });

  test('people management does not corrupt tasks', () => {
    render(<App />);

    addPerson('Alice');
    expect(screen.getByText('Alice')).toBeInTheDocument();

    // bottom bar should still exist for adding people
    const bottom = document.querySelector('.bottom-input-bar');
    expect(bottom.querySelector('.add-bar')).toBeTruthy();

    fireEvent.click(screen.getByText('Tasks'));
    addTask('task two');
    expect(screen.getByText('task two')).toBeInTheDocument();

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
