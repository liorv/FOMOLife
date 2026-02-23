import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectEditor from '../src/components/ProjectEditor';

// mock helpers used by ProjectEditor
const defaultProps = {
  project: {
    id: 'proj1',
    text: 'Test project',
    subprojects: [],
  },
  onApplyChange: jest.fn(),
  allPeople: [],
  onCreatePerson: jest.fn(),
  onOpenPeople: jest.fn(),
  onAddSubproject: jest.fn(),
  onBack: jest.fn(),
};

describe('ProjectEditor', () => {
  test('fab button shows and hides a menu when clicked', () => {
    render(<ProjectEditor {...defaultProps} />);

    const fab = screen.getByTitle('Add subproject');
    expect(fab).toBeInTheDocument();

    // menu should not exist initially
    expect(screen.queryByRole('menu')).toBeNull();

    // open the menu
    fireEvent.click(fab);

    const menu = document.querySelector('.fab-menu');
    expect(menu).toBeTruthy();

    // the menu container is rendered and uses the CSS class (z-index is managed
    // in the stylesheet rather than inline, so jsdom won't provide a value here)
    expect(menu.classList.contains('fab-menu')).toBe(true);

    // the two submenu buttons should be present
    const aiBtn = screen.getByTitle('AI assisted subproject');
    const manualBtn = screen.getByTitle('Add manual subproject');
    expect(aiBtn).toBeInTheDocument();
    expect(manualBtn).toBeInTheDocument();
    // labels should be visible
    expect(aiBtn.textContent).toContain('AI assisted project design');
    expect(manualBtn.textContent).toContain('Add subproject');
    // ensure they are not fixed-position (so they flow above the main FAB)
    expect(window.getComputedStyle(aiBtn).position).not.toBe('fixed');
    expect(window.getComputedStyle(manualBtn).position).not.toBe('fixed');
    // clicking again should close it
    fireEvent.click(fab);
    expect(document.querySelector('.fab-menu')).toBeNull();
  });

  test('generated inputs include unique id attributes for accessibility', () => {
    const props = {
      ...defaultProps,
      project: {
        ...defaultProps.project,
        subprojects: [
          { id: 'sub1', text: 'foo', newTaskText: '' },
        ],
      },
    };
    render(<ProjectEditor {...props} />);
    // the subproject name input should have an id based on the subproject id
    const nameInput = document.getElementById('subproject-name-sub1');
    expect(nameInput).toBeInTheDocument();
    // the new-task input likewise
    const taskInput = document.getElementById('new-task-sub1');
    expect(taskInput).toBeInTheDocument();
  });
});
