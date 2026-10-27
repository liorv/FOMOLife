import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProjectTile, PROJECT_COLORS } from '../src';
import type { ProjectItem } from '@myorg/types';
import '@testing-library/jest-dom';

function firePointerEvent(
  element: HTMLElement,
  type: string,
  pointerType: string,
  clientX: number,
  clientY: number,
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: pointerType },
    isPrimary: { value: true },
    button: { value: 0 },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  fireEvent(element, event);
}

const project: ProjectItem = {
  id: 'p1',
  text: 'Test',
  color: PROJECT_COLORS[0]!,
  subprojects: [],
};

function swipeTouch(tile: HTMLElement, dx: number) {
  fireEvent.touchStart(tile, { touches: [{ clientX: 150, clientY: 100 }] });
  fireEvent.touchMove(tile, { touches: [{ clientX: 150 + dx, clientY: 102 }] });
  fireEvent.touchEnd(tile, {
    changedTouches: [{ clientX: 150 + dx, clientY: 102 }],
  });
}

test('renders project tile with name and color', () => {
  render(
    <ProjectTile
      project={project}
      onEdit={() => {}}
      onDelete={() => {}}
      onChangeColor={() => {}}
      onReorder={() => {}}
    />,
  );

  expect(screen.getByText('Test')).toBeInTheDocument();
  expect(screen.getByTestId('project-tile')).toHaveStyle(
    '--project-color: #D32F2F',
  );
});

test('renders custom card details without the large ring or duplicate progress and preserves actions', () => {
  render(<ProjectTile project={project} details={<div>Project brief</div>} />);
  const tile = screen.getByTestId('project-tile');
  expect(tile).toHaveClass('brief');
  expect(tile.querySelector('.briefIcon')).toHaveTextContent('T');
  expect(screen.getByText('Project brief')).toBeInTheDocument();
  expect(tile.querySelector('.progress-visualization')).not.toBeInTheDocument();
  expect(tile.querySelector('.project-stats')).not.toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  expect(tile).toHaveAttribute('draggable', 'true');
  expect(tile.querySelector('.project-name-row')).toContainElement(
    screen.getByRole('button', { name: 'Open actions for Test' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open actions for Test' }));
  expect(tile).toHaveClass('project-tile-actions-open');
});

test('uses the project photo for the small title icon when supplied', () => {
  render(<ProjectTile project={{ ...project, avatarUrl: '/project.png' }} details={<div>Brief</div>} />);
  const icon = screen.getByTestId('project-tile').querySelector('.briefIcon')!;
  expect(icon.querySelector('img')).toHaveAttribute('src', '/project.png');
  expect(icon).toHaveAttribute('aria-hidden', 'true');
});

test.each(['cards', 'list', 'compact'])(
  'closes the tray with its dedicated click and drag handle in %s view',
  (view) => {
    const onOpen = jest.fn();
    render(
      <div className={`dashboard-tiles-grid dashboard-tiles-grid--${view}`} onClick={onOpen}>
        <ProjectTile project={project} {...(view === 'cards' ? { details: <div>Brief</div> } : {})} />
      </div>,
    );
    const tile = screen.getByTestId('project-tile');
    const opener = screen.getByRole('button', { name: 'Open actions for Test' });
    opener.focus();
    fireEvent.click(opener);
    const close = screen.getByRole('button', { name: 'Close action tray for Test' });
    expect(close).toHaveFocus();
    expect(close.parentElement).toHaveClass('actionTray');
    expect(close.parentElement?.querySelector('.actionGrid')).not.toContainElement(close);
    fireEvent.click(close);
    expect(tile).not.toHaveClass('project-tile-actions-open');
    expect(opener).toHaveFocus();

    fireEvent.click(opener);
    firePointerEvent(close, 'pointerdown', 'mouse', 150, 100);
    const nativeDrag = new Event('dragstart', { bubbles: true, cancelable: true });
    fireEvent(tile, nativeDrag);
    expect(nativeDrag.defaultPrevented).toBe(true);
    firePointerEvent(tile, 'pointermove', 'mouse', 220, 100);
    firePointerEvent(tile, 'pointerup', 'mouse', 220, 100);
    fireEvent.click(close);
    expect(tile).not.toHaveClass('project-tile-actions-open');
    expect(opener).toHaveFocus();

    fireEvent.click(opener);
    fireEvent.touchStart(close, { touches: [{ clientX: 150, clientY: 100 }] });
    fireEvent.touchMove(close, { touches: [{ clientX: 220, clientY: 102 }] });
    fireEvent.touchEnd(close, { changedTouches: [{ clientX: 220, clientY: 102 }] });
    fireEvent.click(close);
    expect(tile).not.toHaveClass('project-tile-actions-open');
    expect(onOpen).not.toHaveBeenCalled();
  },
);

test('renders direct actions instead of the old floating menu', () => {
  render(
    <ProjectTile
      project={project}
      onEdit={() => {}}
      onDelete={() => {}}
      onChangeColor={() => {}}
      onReorder={() => {}}
    />,
  );

  expect(
    screen.getByRole('button', { name: 'Change Test color' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Project menu' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByTitle('More options')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit Test' })).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Delete Test' }),
  ).toBeInTheDocument();
});

test('reveals project actions with a left pointer swipe and dismisses with a right swipe', () => {
  const onEdit = jest.fn();
  render(
    <ProjectTile
      project={project}
      onEdit={onEdit}
      onDelete={() => {}}
      onChangeColor={() => {}}
      onReorder={() => {}}
    />,
  );

  const tile = screen.getByTestId('project-tile');
  const swipe = (dx: number) => {
    firePointerEvent(tile, 'pointerdown', 'mouse', 150, 100);
    firePointerEvent(tile, 'pointermove', 'mouse', 150 + dx, 100);
    firePointerEvent(tile, 'pointerup', 'mouse', 150 + dx, 100);
  };

  swipe(-60);
  expect(tile).toHaveClass('project-tile-actions-open');
  expect(onEdit).not.toHaveBeenCalled();

  swipe(100);
  expect(tile).not.toHaveClass('project-tile-actions-open');
  expect(onEdit).not.toHaveBeenCalled();
});

test.each(['cards', 'list', 'compact'])(
  'toggles actions with the right-edge handle without activating the tile in %s view',
  (view) => {
    const onOpen = jest.fn();
    render(
      <div className={`dashboard-tiles-grid dashboard-tiles-grid--${view}`} onClick={onOpen} onKeyDown={onOpen}>
        <ProjectTile project={project} />
      </div>,
    );
    const tile = screen.getByTestId('project-tile');
    const handle = screen.getByRole('button', { name: 'Open actions for Test' });
    const tray = screen.getByRole('group', { name: 'Test actions' });
    expect(tile.querySelector('.project-name-row')).toContainElement(handle);
    expect(screen.getAllByRole('button', { name: 'Open actions for Test' })).toHaveLength(1);
    expect(handle).toHaveAttribute('aria-expanded', 'false');
    expect(handle).toHaveAttribute('aria-controls', tray.id);
    const closedChevron = handle.querySelector('path')?.getAttribute('d');
    const cells = Array.from(handle.querySelectorAll('rect'));
    expect(cells).toHaveLength(6);
    expect(new Set(cells.map(cell => cell.getAttribute('x'))).size).toBe(3);
    expect(new Set(cells.map(cell => cell.getAttribute('y'))).size).toBe(2);

    fireEvent.mouseEnter(tile);
    fireEvent.focus(tile);
    expect(tile).not.toHaveClass('project-tile-actions-open');
    fireEvent.keyDown(handle, { key: 'Enter' });
    fireEvent.click(handle);
    expect(tile).toHaveClass('project-tile-actions-open');
    expect(handle).toHaveAccessibleName('Close actions for Test');
    expect(handle).toHaveAttribute('aria-expanded', 'true');
    expect(handle.querySelector('path')?.getAttribute('d')).not.toBe(closedChevron);

    fireEvent.click(handle);
    expect(tile).not.toHaveClass('project-tile-actions-open');
    expect(handle).toHaveAttribute('aria-expanded', 'false');
    expect(handle.querySelector('path')?.getAttribute('d')).toBe(closedChevron);
    expect(onOpen).not.toHaveBeenCalled();
  },
);

test('keeps the handle in sync with swipes and returns focus to it on Escape', () => {
  render(<ProjectTile project={project} />);
  const tile = screen.getByTestId('project-tile');
  const handle = screen.getByRole('button', { name: 'Open actions for Test' });
  swipeTouch(tile, -60);
  expect(handle).toHaveAttribute('aria-expanded', 'true');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Edit Test' }), { key: 'Escape' });
  expect(handle).toHaveAttribute('aria-expanded', 'false');
  expect(handle).toHaveFocus();
  swipeTouch(tile, -60);
  fireEvent.pointerDown(document.body);
  expect(handle).toHaveAttribute('aria-expanded', 'false');
});

test('does not treat a vertical pointer movement as a project swipe', () => {
  const onEdit = jest.fn();
  render(
    <ProjectTile
      project={project}
      onEdit={onEdit}
      onDelete={() => {}}
      onChangeColor={() => {}}
      onReorder={() => {}}
    />,
  );

  const tile = screen.getByTestId('project-tile');
  firePointerEvent(tile, 'pointerdown', 'touch', 150, 100);
  firePointerEvent(tile, 'pointermove', 'touch', 160, 180);
  firePointerEvent(tile, 'pointerup', 'touch', 160, 180);

  expect(tile).not.toHaveClass('project-tile-actions-open');
  expect(onEdit).not.toHaveBeenCalled();
});

test.each(['cards', 'list', 'compact'])(
  'reveals actions on touch swipe in %s view',
  (view) => {
    render(
      <div className={`dashboard-tiles-grid dashboard-tiles-grid--${view}`}>
        <div className="dashboard-tile-wrapper">
          <ProjectTile
            project={project}
            onEdit={() => {}}
            onDelete={() => {}}
            onChangeColor={() => {}}
            onReorder={() => {}}
          />
        </div>
      </div>,
    );

    const tile = screen.getByTestId('project-tile');
    swipeTouch(tile, -70);
    expect(tile).toHaveClass('project-tile-actions-open');
  },
);

test.each([-1, 1])(
  'opens on a %s-direction touch swipe only at the threshold',
  (direction) => {
    render(<ProjectTile project={project} />);
    const tile = screen.getByTestId('project-tile');
    swipeTouch(tile, direction * 43);
    expect(tile).not.toHaveClass('project-tile-actions-open');
    swipeTouch(tile, direction * 44);
    expect(tile).toHaveClass('project-tile-actions-open');
  },
);

test('follows a horizontal swipe, restores on cancellation, and leaves vertical scrolling alone', () => {
  const onTouchEnd = jest.fn();
  render(
    <div onTouchEnd={onTouchEnd}>
      <ProjectTile project={project} />
    </div>,
  );
  const tile = screen.getByTestId('project-tile');
  fireEvent.touchStart(tile, { touches: [{ clientX: 150, clientY: 100 }] });
  fireEvent.touchMove(tile, { touches: [{ clientX: 35, clientY: 102 }] });
  expect(tile).toHaveClass('swiping');
  expect(tile).toHaveStyle('--actions-offset: 50%');
  fireEvent.touchCancel(tile);
  expect(tile).not.toHaveClass('swiping', 'project-tile-actions-open');

  fireEvent.touchStart(tile, { touches: [{ clientX: 150, clientY: 100 }] });
  fireEvent.touchMove(tile, { touches: [{ clientX: 160, clientY: 180 }] });
  fireEvent.touchEnd(tile, {
    changedTouches: [{ clientX: 160, clientY: 180 }],
  });
  expect(onTouchEnd).toHaveBeenCalledTimes(1);
  expect(tile).not.toHaveClass('project-tile-actions-open');
});

test('owns horizontal swipes, suppresses their click, and dismisses on a later tap', () => {
  const onOpen = jest.fn();
  const onTouchEnd = jest.fn();
  render(
    <div onClick={onOpen} onTouchEnd={onTouchEnd}>
      <ProjectTile project={project} />
    </div>,
  );
  const tile = screen.getByTestId('project-tile');
  swipeTouch(tile, -60);
  expect(onTouchEnd).not.toHaveBeenCalled();
  fireEvent.click(tile);
  expect(onOpen).not.toHaveBeenCalled();
  expect(tile).toHaveClass('project-tile-actions-open');
  fireEvent.click(tile);
  expect(onOpen).not.toHaveBeenCalled();
  expect(tile).not.toHaveClass('project-tile-actions-open');
  fireEvent.click(tile);
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('dismisses on outside pointer down and Escape', () => {
  render(<ProjectTile project={project} />);
  const tile = screen.getByTestId('project-tile');
  swipeTouch(tile, -60);
  fireEvent.pointerDown(document.body);
  expect(tile).not.toHaveClass('project-tile-actions-open');
  swipeTouch(tile, -60);
  fireEvent.keyDown(tile, { key: 'Escape' });
  expect(tile).not.toHaveClass('project-tile-actions-open');
});

test('keeps an open tray on a cancelled swipe and dismisses it with a right swipe', () => {
  render(<ProjectTile project={project} />);
  const tile = screen.getByTestId('project-tile');
  swipeTouch(tile, -60);
  fireEvent.touchStart(tile, { touches: [{ clientX: 150, clientY: 100 }] });
  fireEvent.touchMove(tile, { touches: [{ clientX: 210, clientY: 100 }] });
  fireEvent.touchCancel(tile);
  expect(tile).toHaveClass('project-tile-actions-open');
  swipeTouch(tile, 43);
  expect(tile).toHaveClass('project-tile-actions-open');
  swipeTouch(tile, 44);
  expect(tile).not.toHaveClass('project-tile-actions-open');
});

test('supports direct edit, rename, color, and archive without activating the parent tile', () => {
  const onOpen = jest.fn();
  const onEdit = jest.fn();
  const onTitleChange = jest.fn();
  const onOpenColorPicker = jest.fn();
  const onArchiveToggle = jest.fn();
  render(
    <div onClick={onOpen} onKeyDown={onOpen}>
      <ProjectTile
        project={project}
        onEdit={onEdit}
        onTitleChange={onTitleChange}
        onOpenColorPicker={onOpenColorPicker}
        onArchiveToggle={onArchiveToggle}
      />
    </div>,
  );
  fireEvent.keyDown(screen.getByRole('button', { name: 'Edit Test' }), {
    key: 'Enter',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Edit Test' }));
  expect(onEdit).toHaveBeenCalledWith(project.id);
  const colorButton = screen.getByRole('button', { name: 'Change Test color' });
  fireEvent.click(colorButton);
  expect(onOpenColorPicker).toHaveBeenCalledWith(project.id, colorButton);
  fireEvent.click(screen.getByRole('button', { name: 'Complete Test' }));
  expect(onArchiveToggle).toHaveBeenCalledWith(project.id, true);
  fireEvent.click(screen.getByRole('button', { name: 'Rename Test' }));
  const nameInput = screen.getByRole('textbox', { name: 'Edit project name' });
  fireEvent.change(nameInput, { target: { value: 'Renamed' } });
  fireEvent.keyDown(nameInput, { key: 'Enter' });
  expect(onTitleChange).toHaveBeenCalledWith(project.id, 'Renamed');
  expect(onOpen).not.toHaveBeenCalled();
});

test('keeps delete confirmation and cancellation in the tray', () => {
  const onDelete = jest.fn();
  const onConfirmDelete = jest.fn();
  const { rerender } = render(
    <ProjectTile project={project} onDelete={onDelete} onExternalUrlChange={() => {}} onArchiveToggle={() => {}} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete Test' }));
  expect(onDelete).toHaveBeenCalledWith(project.id);
  expect(screen.getByTestId('project-tile')).toHaveClass(
    'project-tile-actions-open',
  );
  rerender(
    <ProjectTile
      project={project}
      isPendingDelete
      onDelete={onDelete}
      onConfirmDelete={onConfirmDelete}
      onExternalUrlChange={() => {}}
      onArchiveToggle={() => {}}
    />,
  );
  const tray = screen.getByRole('group', { name: 'Test actions' });
  expect(tray.querySelector('.actionGrid')?.children).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Close action tray for Test' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit Test' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Rename Test' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete Test' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Confirm delete Test' }).parentElement)
    .toBe(screen.getByRole('button', { name: 'Cancel delete' }).parentElement);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel delete' }));
  expect(onDelete).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete Test' }));
  expect(onConfirmDelete).toHaveBeenCalledWith(project.id);
});

test('preserves restore and membership-aware leave confirmation', () => {
  const onLeave = jest.fn();
  const onArchiveToggle = jest.fn();
  render(
    <ProjectTile
      project={{
        ...project,
        archived: true,
        members: [
          { userId: 'u1', role: 'owner' },
          { userId: 'u2', role: 'member' },
        ],
      }}
      currentUserId="u1"
      onLeave={onLeave}
      onArchiveToggle={onArchiveToggle}
    />,
  );
  expect(
    screen.queryByRole('button', { name: 'Delete Test' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Restore Test' }));
  expect(onArchiveToggle).toHaveBeenCalledWith(project.id, false);
  fireEvent.click(screen.getByRole('button', { name: 'Leave Test' }));
  expect(onLeave).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: 'Leave project?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Leave Project' }));
  expect(onLeave).toHaveBeenCalledWith(project.id);
});

test('preserves vertical drag reordering without starting a native horizontal drag', () => {
  const onReorder = jest.fn();
  render(<ProjectTile project={project} onReorder={onReorder} />);
  const tile = screen.getByTestId('project-tile');
  const dataTransfer = { setData: jest.fn(), getData: jest.fn(() => '{"projectId":"p2"}') };
  firePointerEvent(tile, 'pointerdown', 'mouse', 150, 100);
  firePointerEvent(tile, 'pointermove', 'mouse', 151, 130);
  fireEvent.dragStart(tile, { clientX: 151, clientY: 130, dataTransfer });
  expect(dataTransfer.setData).toHaveBeenCalledWith('application/json', '{"projectId":"p1"}');
  fireEvent.drop(tile, { dataTransfer });
  expect(onReorder).toHaveBeenCalledWith('p2', 'p1');

  dataTransfer.setData.mockClear();
  firePointerEvent(tile, 'pointerdown', 'mouse', 150, 100);
  firePointerEvent(tile, 'pointermove', 'mouse', 90, 101);
  fireEvent.dragStart(tile, { clientX: 90, clientY: 101, dataTransfer });
  expect(dataTransfer.setData).not.toHaveBeenCalled();
});

test('does not let touch pointer events consume the gesture before touchend stops tab navigation', () => {
  const onTouchEnd = jest.fn();
  render(<div onTouchEnd={onTouchEnd}><ProjectTile project={project} /></div>);
  const tile = screen.getByTestId('project-tile');
  firePointerEvent(tile, 'pointerdown', 'touch', 150, 100);
  fireEvent.touchStart(tile, { touches: [{ clientX: 150, clientY: 100 }] });
  firePointerEvent(tile, 'pointermove', 'touch', 80, 100);
  fireEvent.touchMove(tile, { touches: [{ clientX: 80, clientY: 100 }] });
  firePointerEvent(tile, 'pointerup', 'touch', 80, 100);
  fireEvent.touchEnd(tile, { changedTouches: [{ clientX: 80, clientY: 100 }] });
  expect(tile).toHaveClass('project-tile-actions-open');
  expect(onTouchEnd).not.toHaveBeenCalled();
});
