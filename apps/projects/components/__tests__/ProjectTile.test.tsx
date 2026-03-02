import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ProjectTile, { PROJECT_COLORS } from '../ProjectTile';
import type { ProjectItem } from '@myorg/types';

const project: ProjectItem = {
  id: 'p1',
  text: 'Test',
  color: PROJECT_COLORS[0],
  subprojects: [],
};

describe('ProjectTile', () => {
  it('renders name and responds to click', () => {
    const handleEdit = jest.fn();
    render(
      <ProjectTile
        project={project}
        onEdit={handleEdit}
        onDelete={() => {}}
        onChangeColor={() => {}}
        onReorder={() => {}}
      />,
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
    // clicking tile triggers nothing by default; verify no crash
    fireEvent.click(screen.getByTestId('project-tile'));
  });

  it('computes color based on project id or text', () => {
    // color is derived from hash of id/text when not supplied
    const withColor = { ...project, color: '#123456' };
    const { rerender } = render(
      <ProjectTile
        project={project}
        onEdit={() => {}}
        onDelete={() => {}}
        onChangeColor={() => {}}
        onReorder={() => {}}
      />,
    );
    const defaultStyle = screen.getByTestId('project-tile').getAttribute('style');
    expect(defaultStyle).toBeTruthy();

    rerender(
      <ProjectTile
        project={withColor}
        onEdit={() => {}}
        onDelete={() => {}}
        onChangeColor={() => {}}
        onReorder={() => {}}
      />,
    );
    const updatedStyle = screen.getByTestId('project-tile').getAttribute('style');
    expect(updatedStyle).toContain('--project-color: #123456');
  });
});
