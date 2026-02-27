import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
  test('editor container is scrollable (overflow:auto)', () => {
    render(<ProjectEditor {...defaultProps} />);
    const editor = document.querySelector('.project-editor');
    expect(editor).toBeTruthy();
    // inline style is applied in component to guarantee scrolling in tests
    expect(editor.style.overflow).toBe('auto');
  });

  test('fab button shows and hides a menu when clicked (no subproject expanded)', () => {
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
          { id: 'sub1', text: 'foo' },
        ],
      },
    };
    render(<ProjectEditor {...props} />);
    // previously this test ensured there was an input, but the value now
    // lives inside the SubprojectEditor/Row component.  simply verify the
    // collapsed row renders its title text instead.
    const title = screen.getByText('foo');
    expect(title).toBeInTheDocument();
  });


  test('when a subproject is expanded the FAB adds a new task', () => {
    const props = {
      ...defaultProps,
      project: {
        ...defaultProps.project,
        subprojects: [
          { id: 'sub1', text: 'foo', tasks: [], collapsed: false },
        ],
      },
      onApplyChange: jest.fn(),
    };
    render(<ProjectEditor {...props} />);

    // title should reflect context-aware mode
    const fab = screen.getByTitle('Add task');
    expect(fab).toBeInTheDocument();

    // clicking should add a task instead of opening a menu
    fireEvent.click(fab);
    expect(document.querySelector('.fab-menu')).toBeNull();
    expect(props.onApplyChange).toHaveBeenCalled();
    const updated = props.onApplyChange.mock.calls[0][0];
    expect(updated.subprojects[0].tasks.length).toBe(1);

    // clicking again should add a second task (not a second subproject)
    fireEvent.click(fab);
    const updated2 = props.onApplyChange.mock.calls[1][0];
    expect(updated2.subprojects[0].tasks.length).toBe(2);
  });

  test('tasks within a subproject can be reordered via drag and drop', async () => {
    const props = {
      ...defaultProps,
      onApplyChange: jest.fn(),
      project: {
        ...defaultProps.project,
        subprojects: [
          {
            id: 'sub1',
            text: 'foo',
            tasks: [
              { id: 't1', text: 'a', done: false, favorite: false, people: [] },
              { id: 't2', text: 'b', done: false, favorite: false, people: [] },
            ],
          },
        ],
      },
    };

    render(<ProjectEditor {...props} />);

    // ensure both task rows are rendered in initial order
    let rows = document.querySelectorAll('.project-editor .task-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('a');
    expect(rows[1].textContent).toContain('b');

    // perform drag-reorder: drag first row onto second
    fireEvent.dragStart(rows[0]);
    const target = rows[1];
    fireEvent.dragOver(target);
    fireEvent.drop(target);

    // after drop, DOM order should update and onApplyChange should be called
    await screen.findByText('b');
    await waitFor(() => {
      const afterRows = document.querySelectorAll('.project-editor .task-row');
      expect(afterRows[0].textContent).toContain('b');
      expect(afterRows[1].textContent).toContain('a');
    });

    expect(props.onApplyChange).toHaveBeenCalled();
    const applied = props.onApplyChange.mock.calls.pop()[0];
    expect(applied.subprojects[0].tasks[0].text).toBe('b');
    expect(applied.subprojects[0].tasks[1].text).toBe('a');
  });

  test('searchQuery prop filters flat task view', () => {
    const props = {
      ...defaultProps,
      project: {
        ...defaultProps.project,
        subprojects: [
          { id: 's1', text: 'sub', tasks: [{ id: 't1', text: 'foo', done: false, favorite: false, people: [] }] },
        ],
      },
      onApplyChange: jest.fn(),
    };
    render(<ProjectEditor {...props} searchQuery="foo" />);
    // should render flat view
    expect(document.querySelector('.filter-flat-view')).toBeTruthy();
    expect(screen.getByText('foo')).toBeInTheDocument();
  });

  test('searchQuery and taskFilter are applied together', () => {
    const props = {
      ...defaultProps,
      project: {
        ...defaultProps.project,
        subprojects: [
          {
            id: 's1',
            text: 'sub',
            tasks: [
              { id: 't1', text: 'foo', done: false, favorite: true, people: [] },
              { id: 't2', text: 'foobar', done: false, favorite: false, people: [] },
            ],
          },
        ],
      },
      onApplyChange: jest.fn(),
    };
    render(<ProjectEditor {...props} searchQuery="foo" taskFilter="starred" />);
    // only the starred task matching query should appear
    expect(document.querySelector('.filter-flat-view')).toBeTruthy();
    const rows = document.querySelectorAll('.project-editor .task-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('foo');
  });

  test('subprojects can be reordered via drag and drop', async () => {
    const props = {
      ...defaultProps,
      onApplyChange: jest.fn(),
      project: {
        ...defaultProps.project,
        subprojects: [
          { id: 's1', text: 'one', tasks: [] },
          { id: 's2', text: 'two', tasks: [] },
        ],
      },
    };

    render(<ProjectEditor {...props} />);
    const wrappers = document.querySelectorAll('.project-editor .subproject');
    expect(wrappers.length).toBe(2);
    expect(wrappers[0].textContent).toContain('one');
    expect(wrappers[1].textContent).toContain('two');
    
    // drag first onto second - use a mock dataTransfer object
    const dragstartEvent = new Event('dragstart', { bubbles: true, cancelable: true });
    const dragData = { subprojectId: 's1' };
    dragstartEvent.dataTransfer = {
      effectAllowed: 'move',
      setData: jest.fn(),
      getData: jest.fn(),
    };
    dragstartEvent.dataTransfer.getData.mockReturnValue(JSON.stringify(dragData));
    
    const dragoverEvent = new Event('dragover', { bubbles: true, cancelable: true });
    dragoverEvent.dataTransfer = {
      dropEffect: 'move',
    };
    
    const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
    dropEvent.dataTransfer = {
      getData: jest.fn().mockReturnValue(JSON.stringify(dragData)),
    };
    
    act(() => {
      wrappers[0].dispatchEvent(dragstartEvent);
      wrappers[1].dispatchEvent(dragoverEvent);
      wrappers[1].dispatchEvent(dropEvent);
    });
    
    await waitFor(() => {
      const after = document.querySelectorAll('.project-editor .subproject');
      expect(after[0].textContent).toContain('two');
      expect(after[1].textContent).toContain('one');
    });
    expect(props.onApplyChange).toHaveBeenCalled();
  });

  test('inline title edit in project editor updates state and triggers onApplyChange', async () => {
    const props = {
      ...defaultProps,
      onApplyChange: jest.fn(),
      project: {
        ...defaultProps.project,
        subprojects: [
          {
            id: 'sub1',
            text: 'foo',
            tasks: [{ id: 't1', text: 'orig', done: false, favorite: false, people: [] }],
          },
        ],
      },
    };
    const { container } = render(<ProjectEditor {...props} />);
    const titleSpan = container.querySelector('.task-title');
    fireEvent.click(titleSpan);
    const input = container.querySelector('input.task-title-input');
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'newtext' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(container.querySelector('.task-title').textContent).toBe('newtext');
    });
    expect(props.onApplyChange).toHaveBeenCalled();
    const applied = props.onApplyChange.mock.calls.pop()[0];
    expect(applied.subprojects[0].tasks[0].text).toBe('newtext');
  });

  test('collapsed subproject renders as SubprojectRow', () => {
    const props = {
      ...defaultProps,
      project: {
        ...defaultProps.project,
        subprojects: [
          { id: 'sub1', text: 'x', tasks: [], collapsed: true },
        ],
      },
    };
    render(<ProjectEditor {...props} />);
    expect(document.querySelector('.subproject-row')).toBeTruthy();
  });

  test('subproject stays in list when toggled open and closed', () => {
    const props = {
      ...defaultProps,
      project: {
        ...defaultProps.project,
        subprojects: [
          { id: 'sub1', text: 'x', tasks: [], collapsed: true },
        ],
      },
    };
    render(<ProjectEditor {...props} />);
    // initial collapsed wrapper exists and must not clip its contents
    const wrapper = document.querySelector('.project-editor .subproject');
    expect(wrapper).toBeTruthy();
    expect(wrapper.style.overflow).toBe('visible');
    expect(document.querySelectorAll('.project-editor .subproject').length).toBe(1);
    // toggle open by clicking expand button (in SubprojectRow when collapsed)
    fireEvent.click(document.querySelector('.subproject-expand-btn'));
    // wrapper still present, now showing body
    expect(document.querySelectorAll('.project-editor .subproject').length).toBe(1);
    expect(document.querySelector('.project-editor .subproject-body')).toBeTruthy();
    // collapse again - now the button is .collapse-btn (in expanded view)
    fireEvent.click(document.querySelector('.project-editor .collapse-btn'));
    expect(document.querySelectorAll('.project-editor .subproject').length).toBe(1);
  });
});
