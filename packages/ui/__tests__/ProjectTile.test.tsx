import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProjectTile, PROJECT_COLORS } from '../src';
import type { ProjectItem } from '@myorg/types';
import '@testing-library/jest-dom';

const project: ProjectItem = {
  id: 'p1',
  text: 'Test',
  color: PROJECT_COLORS[0]!,
  subprojects: [],
};

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
  expect(screen.getByTestId('project-tile')).toHaveStyle('--project-color: #D32F2F');
});
