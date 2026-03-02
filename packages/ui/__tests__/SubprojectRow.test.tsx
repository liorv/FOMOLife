import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubprojectRow, PROJECT_COLORS } from '../src';
import type { ProjectSubproject } from '@myorg/types';

const sub: ProjectSubproject = {
  id: 's1',
  text: 'Sub',
  color: PROJECT_COLORS[1]!,
  tasks: [],
};

it('renders subproject row and handles click', () => {
  const handleEdit = jest.fn();
  render(
    <SubprojectRow
      sub={sub}
      onEdit={handleEdit}
      onNameChange={() => {}}
    />,
  );

  expect(screen.getByText('Sub')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Sub'));
  expect(handleEdit).toHaveBeenCalledWith('s1');
});
