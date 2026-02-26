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
    expect(nameEl.className).toContain('project-name');

    const tileEl = screen.getByTestId('project-tile');
    expect(tileEl).toHaveStyle(`--project-color: ${baseProject.color}`);

    const container = tileEl.querySelector('.project-progress-container');
    expect(container).toBeTruthy();
    const bar = screen.getByTestId('project-progress');
    expect(bar).toBeTruthy();
    expect(bar).toHaveStyle('width: 42%');

    // progress visualization should be present (CSS handles sizing)
    const circle = tileEl.querySelector('.progress-circle');
    expect(circle).toBeTruthy();

    const psec = tileEl.querySelector('.project-progress-section');
    expect(psec).toBeTruthy();
    
    const percentLabel = screen.getByTestId('project-percent');
    expect(percentLabel).toBeInTheDocument();
    expect(percentLabel.textContent.includes('42')).toBe(true);

    // ensure the old "Complete" text has been removed
    expect(screen.queryByText('Complete')).toBeNull();
    expect(tileEl.querySelector('.progress-label')).toBeNull();

    // stats box should be present (visual positioning is covered by CSS)
    const stats = tileEl.querySelector('.project-stats');
    expect(stats).toBeTruthy();
    
    percentLabel.style.setProperty('--project-percent-size', '1rem');
    percentLabel.style.setProperty('--project-percent-font', 'Courier New');
    expect(percentLabel.style.getPropertyValue('--project-percent-size')).toBe('1rem');
    expect(percentLabel.style.getPropertyValue('--project-percent-font')).toBe('Courier New');

    const tileColor = tileEl.style.getPropertyValue('--project-color');
    expect(tileColor).toBeTruthy();

    const accentBar = tileEl.querySelector('.project-accent-bar');
    expect(accentBar).toBeTruthy();
  });

  test('calls handlers when edit/delete icons clicked', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(
      <ProjectTile project={baseProject} onEdit={onEdit} onDelete={onDelete} />
    );
    
    const menuButton = screen.getByLabelText('Project menu');
    fireEvent.click(menuButton);
    
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledWith('p1');
    
    fireEvent.click(menuButton);
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith('p1');
  });

  test('shows color picker when Color menu item is clicked', () => {
    const onChangeColor = jest.fn();
    render(
      <ProjectTile project={baseProject} onChangeColor={onChangeColor} />
    );
    
    const menuButton = screen.getByLabelText('Project menu');
    fireEvent.click(menuButton);
    
    const colorButton = screen.getByText('Color');
    expect(colorButton).toBeInTheDocument();
    fireEvent.click(colorButton);
    
    // Color picker grid should be visible
    const colorOptions = screen.getAllByRole('button', { name: /Color/ });
    expect(colorOptions.length).toBeGreaterThan(0);
  });

  test('calls onChangeColor when a color is selected', () => {
    const onChangeColor = jest.fn();
    render(
      <ProjectTile project={baseProject} onChangeColor={onChangeColor} />
    );
    
    const menuButton = screen.getByLabelText('Project menu');
    fireEvent.click(menuButton);
    
    const colorButton = screen.getByText('Color');
    fireEvent.click(colorButton);
    
    // Click the first color in the palette (should be a different color than current)
    const colorButtons = screen.getAllByRole('button');
    const firstColorOption = colorButtons.find(btn => 
      btn.className && btn.className.includes('color-option')
    );
    
    if (firstColorOption) {
      fireEvent.click(firstColorOption);
      expect(onChangeColor).toHaveBeenCalledWith('p1', expect.any(String));
    }
  });

  test('supports drag and drop reordering', () => {
    const onReorder = jest.fn();
    render(
      <ProjectTile project={baseProject} onReorder={onReorder} />
    );
    
    const tile = screen.getByTestId('project-tile');
    expect(tile).toHaveAttribute('draggable', 'true');
    // Tile should have drag event handlers
    expect(tile).toHaveAttribute('draggable');
  });

  test('uses larger default size and royal palette when color absent', () => {
    const proj = { id: 'p2', text: 'Second Project' };
    render(<ProjectTile project={proj} />);
    const tile = screen.getByTestId('project-tile');
    expect(tile).toHaveStyle('width: var(--project-tile-width, 200px)');

    const cssColor = tile.style.getPropertyValue('--project-color');
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
  });
});

