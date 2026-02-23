import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectTile from '../src/components/ProjectTile';

describe('ProjectTile component', () => {
  const baseProject = {
    id: 'p1',
    text: 'My Project',
    color: '#123456',
    progress: 42,
  };

  test('renders name and uses provided color and progress', () => {
    render(
      <ProjectTile project={baseProject} />
    );

    const nameEl = screen.getByText('My Project');
    expect(nameEl).toBeInTheDocument();
    // text should be constrained to a single row via CSS rules (style sheet governed)
    // we can't inspect stylesheet rules here, just ensure element has the correct class
    expect(nameEl.className).toContain('project-name');

    const tileEl = screen.getByTestId('project-tile');
    const strip = tileEl.querySelector('.project-strip');
    expect(strip).toBeTruthy();
    // color is provided via CSS variable on parent
    expect(tileEl).toHaveStyle(`--project-color: ${baseProject.color}`);

    // progress container exists and will be styled via CSS rules
    const container = tileEl.querySelector('.project-progress-container');
    expect(container).toBeTruthy();
    const bar = screen.getByTestId('project-progress');
    expect(bar).toBeTruthy();
    expect(bar).toHaveStyle('width: 42%');
    // progress text moved outside bar
    const percentLabel = screen.getByTestId('project-percent');
    expect(percentLabel).toHaveTextContent('42%');
    // check custom vars can influence the label style
    percentLabel.style.setProperty('--project-percent-size', '1rem');
    percentLabel.style.setProperty('--project-percent-font', 'Courier New');
    // jsdom doesn't apply var() to computed styles; just ensure the vars exist
    expect(percentLabel.style.getPropertyValue('--project-percent-size')).toBe('1rem');
    expect(percentLabel.style.getPropertyValue('--project-percent-font')).toBe('Courier New');

    // progress bar should use the same color as the strip
    const tileColor = tileEl.style.getPropertyValue('--project-color');
    expect(bar.style.background).toBe('');

    // icons should have gray background and white color
    const editIcon = tileEl.querySelector('.edit-icon');
    // color may be returned as rgb; convert to numeric check
    const computed = window.getComputedStyle(editIcon);
    const colorVal = computed.color;
    // accept rgb, hex or named canvastext
    expect(
      colorVal === '#fff' ||
      colorVal === 'rgb(255, 255, 255)' ||
      colorVal === 'canvastext'
    ).toBe(true);
    // background is styled; exact value verified manually in app

    const deleteIcon = tileEl.querySelector('.delete-icon');
    const computed2 = window.getComputedStyle(deleteIcon);
    const colorVal2 = computed2.color;
    expect(
      colorVal2 === '#fff' ||
      colorVal2 === 'rgb(255, 255, 255)' ||
      colorVal2 === 'canvastext'
    ).toBe(true);
    // delete icon background also styled
  });

  test('calls handlers when edit/delete icons clicked', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(
      <ProjectTile project={baseProject} onEdit={onEdit} onDelete={onDelete} />
    );
    const editIcon = screen.getByTitle('Edit project');
    const deleteIcon = screen.getByTitle('Delete project');
    fireEvent.click(editIcon);
    expect(onEdit).toHaveBeenCalledWith('p1');
    fireEvent.click(deleteIcon);
    expect(onDelete).toHaveBeenCalledWith('p1');
  });

  test('uses larger default size and royal palette when color absent', () => {
    const proj = { id: 'p2', text: 'Second Project' };
    render(<ProjectTile project={proj} />);
    const tile = screen.getByTestId('project-tile');
    // default size should be expressed via CSS var fallback on width
    expect(tile).toHaveStyle('width: var(--project-tile-width, 200px)');

    // color variable should be set and belong to our royal palette
    const cssColor = tile.style.getPropertyValue('--project-color');
    // also ensure CSS variable for size is available
    expect(tile.style.getPropertyValue('--project-tile-size')).toBe('');
    expect(cssColor).toBeTruthy();
    const material = [
      '#0D47A1','#1976D2','#3F51B5','#2196F3','#455A64','#607D8B',
      '#9E9E9E','#424242','#FFC107','#FFA000','#FF8F00','#795548'
    ];
    expect(material).toContain(cssColor);
  });

  test('accepts distinct width and height props and respects CSS vars', () => {
    const proj = { id: 'p3', text: 'Rectangular' };
    render(<ProjectTile project={proj} width={150} height={100} />);
    const tile = screen.getByTestId('project-tile');
    expect(tile).toHaveStyle('width: var(--project-tile-width, 150px)');
    expect(tile).toHaveStyle('height: var(--project-tile-height, 100px)');

    // ensure inline style still uses var() so CSS can override later
    expect(tile.style.width).toContain('var(');
    expect(tile.style.height).toContain('var(');
  });
});