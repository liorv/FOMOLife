import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ProjectItem } from '@myorg/types';
import { ProjectTile } from '@myorg/ui';
import ProjectEditor from '../projects/ProjectEditor';
import ProjectsDashboard from '../projects/ProjectsDashboard';

const project: ProjectItem = {
  id: 'linked-project',
  text: 'Linked project',
  color: '#1976D2',
  subprojects: [],
};
const url = 'https://example.com/project?view=overview';
const linkName = /Open external link for Linked project/;

function openOverview() {
  fireEvent.click(screen.getByTitle('Edit project overview'));
  return screen.getByRole('textbox', { name: 'External Link' });
}

it('adds, edits, and removes an external link through the overview', () => {
  const onApplyChange = jest.fn();
  render(<ProjectEditor project={project} onApplyChange={onApplyChange} />);
  const input = openOverview();
  fireEvent.change(input, { target: { value: `  ${url}  ` } });
  expect(onApplyChange).not.toHaveBeenCalled();
  fireEvent.blur(input);
  expect(onApplyChange).toHaveBeenLastCalledWith({ externalUrl: url });
  expect(input).toHaveValue(url);

  act(() => input.focus());
  fireEvent.change(input, { target: { value: 'http://example.org/updated' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onApplyChange).toHaveBeenLastCalledWith({ externalUrl: 'http://example.org/updated' });

  fireEvent.change(input, { target: { value: '' } });
  fireEvent.blur(input);
  expect(onApplyChange).toHaveBeenLastCalledWith({ externalUrl: '' });
});

it.each(['javascript:alert(1)', 'data:text/html,test', 'not a url', 'https://'])(
  'shows an error without saving an invalid URL: %s',
  (invalidUrl) => {
    const onApplyChange = jest.fn();
    render(<ProjectEditor project={{ ...project, externalUrl: url }} onApplyChange={onApplyChange} />);
    const input = openOverview();
    fireEvent.change(input, { target: { value: invalidUrl } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid link');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onApplyChange).not.toHaveBeenCalled();
  },
);

it('keeps the link field disabled for a read-only editor', () => {
  const onApplyChange = jest.fn();
  render(<ProjectEditor project={{ ...project, externalUrl: url }} canManage={false} onApplyChange={onApplyChange} />);
  const input = openOverview();
  expect(input).toBeDisabled();
  fireEvent.blur(input);
  expect(onApplyChange).not.toHaveBeenCalled();
});

it('shows a safe new-tab link to the right of the tile name without triggering parent clicks', () => {
  const onClick = jest.fn();
  render(
    <div onClick={onClick}>
      <ProjectTile project={{ ...project, externalUrl: url }} />
    </div>,
  );
  const link = screen.getByRole('link', { name: linkName });
  expect(screen.getByText(project.text).nextElementSibling).toBe(link);
  expect(link).toHaveAttribute('href', url);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  fireEvent.click(link);
  expect(onClick).not.toHaveBeenCalled();
});

it('shows the editor header link and removes it when the saved URL is cleared', async () => {
  const view = render(
    <ProjectsDashboard projects={[{ ...project, externalUrl: url }]} selectedProjectId={project.id} />,
  );
  await act(async () => {});
  const link = screen.getByRole('link', { name: linkName });
  expect(screen.getByRole('heading', { name: project.text }).nextElementSibling).toBe(link);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('href', url);
  view.rerender(<ProjectsDashboard projects={[{ ...project, externalUrl: '' }]} selectedProjectId={project.id} />);
  expect(screen.queryByRole('link', { name: linkName })).not.toBeInTheDocument();
});

it.each([undefined, '', 'javascript:alert(1)'])('does not display a tile link for %s', (externalUrl) => {
  render(<ProjectTile project={{ ...project, ...(externalUrl !== undefined ? { externalUrl } : {}) }} />);
  expect(screen.queryByRole('link', { name: linkName })).not.toBeInTheDocument();
});
