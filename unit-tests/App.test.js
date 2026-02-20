import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App';

// helpers
function addTask(text) {
  const input = screen.getByPlaceholderText(/Add a new/);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
}

function addPerson(name) {
  fireEvent.click(screen.getByText('People'));
  const input = screen.getByPlaceholderText(/Add a new person/);
  fireEvent.change(input, { target: { value: name } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
}

describe('App component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('task CRUD and editor synchronization', () => {
    render(<App />);

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
    expect(screen.getByText(/Edit Task/)).toBeInTheDocument();
    // inline editor should appear immediately beneath the task row
    expect(document.querySelector('.inline-editor')).toBeTruthy();
    // compact header should also be present inside the inline editor
    expect(document.querySelector('.inline-header')).toBeTruthy();
    const icon = document.querySelector('.expand-icon');
    expect(icon).toHaveClass('open');

    // click again to collapse
    fireEvent.click(screen.getByText('first task'));
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

    fireEvent.click(screen.getByText('Tasks'));
    addTask('task two');
    expect(screen.getByText('task two')).toBeInTheDocument();

    // delete the person
    fireEvent.click(screen.getByText('People'));
    const removeBtn = screen.getByLabelText('Delete person');
    fireEvent.click(removeBtn);
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();

    // ensure tasks still there
    fireEvent.click(screen.getByText('Tasks'));
    expect(screen.getByText('task two')).toBeInTheDocument();
  });
});
