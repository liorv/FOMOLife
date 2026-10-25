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
const linkName = /Open (?:external|project) link for Linked project/;

function openOverview() {
  fireEvent.click(screen.getByRole('button', { name: 'Edit project image and overview' }));
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

it('adds a link from the tile and exposes the same saved value in the overview', async () => {
  const onSelectProject = jest.fn();
  const onApplyChange = jest.fn();
  function Projects() {
    const [savedProject, setSavedProject] = React.useState(project);
    const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
    return (
      <ProjectsDashboard
        projects={[savedProject]}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => {
          onSelectProject(id);
          setSelectedProjectId(id);
        }}
        onApplyChange={(id, patch) => {
          onApplyChange(id, patch);
          setSavedProject((current) => ({ ...current, ...patch }));
        }}
      />
    );
  }
  render(<Projects />);
  await act(async () => {});
  const addButton = screen.getByRole('button', { name: `Add link to ${project.text}` });
  expect(screen.getByRole('group', { name: `${project.text} actions` })).toContainElement(addButton);
  fireEvent.click(addButton);
  const input = screen.getByRole('textbox', { name: 'External Link' });
  expect(input).toHaveFocus();
  expect(screen.getByRole('dialog', { name: 'Add project link' })).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByTestId('project-tile')).toHaveAttribute('draggable', 'false');
  fireEvent.change(input, { target: { value: `  ${url}  ` } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onSelectProject).not.toHaveBeenCalled();
  fireEvent.submit(input.closest('form')!);
  expect(onApplyChange).toHaveBeenCalledWith(project.id, { externalUrl: url });
  expect(screen.getByRole('link', { name: linkName })).toHaveAttribute('href', url);
  expect(screen.queryByRole('button', { name: `Add link to ${project.text}` })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: `Edit link for ${project.text}` })).toBeInTheDocument();

  fireEvent.click(screen.getByText(project.text));
  await act(async () => {});
  expect(onSelectProject).toHaveBeenCalledWith(project.id);
  expect(openOverview()).toHaveValue(url);
});

it('validates a pasted tile link and lets the user cancel without saving or opening the project', () => {
  const onExternalUrlChange = jest.fn();
  const onClick = jest.fn();
  render(
    <div onClick={onClick}>
      <ProjectTile project={project} onExternalUrlChange={onExternalUrlChange} />
    </div>,
  );
  fireEvent.click(screen.getByRole('button', { name: `Add link to ${project.text}` }));
  const input = screen.getByRole('textbox', { name: 'External Link' });
  fireEvent.change(input, { target: { value: 'javascript:alert(1)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save link' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid link');
  expect(onExternalUrlChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('textbox', { name: 'External Link' })).not.toBeInTheDocument();
  expect(onClick).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: `Add link to ${project.text}` }));
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'External Link' }), { key: 'Escape' });
  expect(screen.queryByRole('textbox', { name: 'External Link' })).not.toBeInTheDocument();
  expect(onExternalUrlChange).not.toHaveBeenCalled();
});

it.each([undefined, url])('does not offer changing a tile link without a save handler (%s)', (externalUrl) => {
  render(<ProjectTile project={{ ...project, ...(externalUrl ? { externalUrl } : {}) }} />);
  expect(screen.queryByRole('button', { name: `Add link to ${project.text}` })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: `Edit link for ${project.text}` })).not.toBeInTheDocument();
});

it('edits an existing link from the swipe actions and persists it without opening the project', async () => {
  const onApplyChange = jest.fn();
  const onSelectProject = jest.fn();
  const updatedUrl = 'https://example.org/updated';
  function Projects() {
    const [savedProject, setSavedProject] = React.useState({ ...project, externalUrl: url });
    return (
      <ProjectsDashboard
        projects={[savedProject]}
        onSelectProject={onSelectProject}
        onApplyChange={(id, patch) => {
          onApplyChange(id, patch);
          setSavedProject((current) => ({ ...current, ...patch }));
        }}
      />
    );
  }
  render(<Projects />);
  await act(async () => {});
  const tile = screen.getByTestId('project-tile');
  fireEvent.touchStart(tile, { touches: [{ clientX: 150, clientY: 100 }] });
  fireEvent.touchMove(tile, { touches: [{ clientX: 80, clientY: 102 }] });
  fireEvent.touchEnd(tile, { changedTouches: [{ clientX: 80, clientY: 102 }] });
  fireEvent.click(tile);
  expect(tile).toHaveClass('project-tile-actions-open');
  const trigger = screen.getByRole('button', { name: `Edit link for ${project.text}` });
  expect(screen.getByRole('group', { name: `${project.text} actions` })).toContainElement(trigger);
  fireEvent.click(trigger);
  expect(screen.getByRole('dialog', { name: 'Edit project link' })).toBeInTheDocument();
  const input = screen.getByRole('textbox', { name: 'External Link' });
  expect(input).toHaveValue(url);
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: 'javascript:alert(1)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save link' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid link');
  expect(onApplyChange).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: `  ${updatedUrl}  ` } });
  fireEvent.click(screen.getByRole('button', { name: 'Save link' }));
  expect(onApplyChange).toHaveBeenCalledWith(project.id, { externalUrl: updatedUrl });
  expect(screen.getByRole('link', { name: linkName })).toHaveAttribute('href', updatedUrl);
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  expect(screen.getByRole('textbox', { name: 'External Link' })).toHaveValue(updatedUrl);
  fireEvent.change(screen.getByRole('textbox', { name: 'External Link' }), { target: { value: url } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onApplyChange).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('link', { name: linkName })).toHaveAttribute('href', updatedUrl);
  expect(onSelectProject).not.toHaveBeenCalled();
});

it('keeps keyboard focus inside the link dialog and restores it when dismissed', () => {
  const onClick = jest.fn();
  const onExternalUrlChange = jest.fn();
  render(
    <div onClick={onClick}>
      <ProjectTile project={project} onExternalUrlChange={onExternalUrlChange} />
    </div>,
  );
  const trigger = screen.getByRole('button', { name: `Add link to ${project.text}` });
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Add project link' });
  const input = screen.getByRole('textbox', { name: 'External Link' });
  const save = screen.getByRole('button', { name: 'Save link' });
  expect(screen.getByTestId('project-tile')).not.toContainElement(dialog);
  fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
  expect(save).toHaveFocus();
  fireEvent.keyDown(save, { key: 'Tab' });
  expect(input).toHaveFocus();
  fireEvent.click(dialog.parentElement!);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(onClick).not.toHaveBeenCalled();
  expect(onExternalUrlChange).not.toHaveBeenCalled();
});
