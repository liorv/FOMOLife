import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProjectItem } from '@myorg/types';
import { invalidateProjectsCache } from '@/lib/client/projectsCache';
import ProjectsPage from '../ProjectsPage';

jest.mock('@myorg/api-client', () => ({
  createProjectsApiClient: () => mockProjectsApi,
  createContactsApiClient: () => ({ listContacts: async () => [] }),
  createTasksApiClient: () => ({ listTasks: async () => [] }),
}));
jest.mock('@/lib/client/contactsCache', () => ({
  getCachedContacts: async () => [],
  getContactsCacheAge: () => 0,
}));
jest.mock('@/lib/client/projectsCache', () => ({
  getCachedProjectsSync: () => null,
  setCachedProjects: jest.fn(),
  areProjectsStale: () => false,
  getProjectsCacheAge: () => 0,
  invalidateProjectsCache: jest.fn(),
}));
jest.mock('../ProjectsDashboard', () => ({
  __esModule: true,
  default: ({ projects, selectedProjectId, onCreateTemplate, onUseTemplate, onConvertTemplate, onApplyChange }: {
    projects: ProjectItem[];
    selectedProjectId: string | null;
    onCreateTemplate?: (name: string) => Promise<void>;
    onUseTemplate?: (id: string, name: string) => Promise<void>;
    onConvertTemplate?: (id: string, isTemplate: boolean) => Promise<void>;
    onApplyChange: (id: string, patch: Partial<ProjectItem>) => Promise<void>;
  }) => (
    <div>
      <output data-testid="projects">{JSON.stringify(projects)}</output>
      <output data-testid="selected">{selectedProjectId}</output>
      {onCreateTemplate && <button onClick={() => onCreateTemplate('Blank workflow')}>Create template</button>}
      {onUseTemplate && <button onClick={() => onUseTemplate('template', 'My project')}>Use template</button>}
      {onConvertTemplate && <button onClick={() => onConvertTemplate('template', false)}>Convert to project</button>}
      <button onClick={() => onApplyChange('template', { description: 'Latest definition' })}>Edit template</button>
    </div>
  ),
}));

const template: ProjectItem = {
  id: 'template', text: 'Workflow', color: '#7B1FA2', avatarUrl: '/project.svg', isTemplate: true, subprojects: [],
};
const mockProjectsApi = {
  listProjects: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockProjectsApi.listProjects.mockResolvedValue([template]);
  mockProjectsApi.createProject.mockImplementation(async input => ({
    ...template, id: 'created', ...input,
  }));
  mockProjectsApi.updateProject.mockImplementation(async (_id, patch) => ({ ...template, ...patch }));
});

it('persists and opens a newly created blank template', async () => {
  render(<ProjectsPage canManage />);
  await waitFor(() => expect(screen.getByTestId('projects')).toHaveTextContent('Workflow'));
  fireEvent.click(screen.getByRole('button', { name: 'Create template' }));
  await waitFor(() => expect(mockProjectsApi.createProject).toHaveBeenCalledWith({ text: 'Blank workflow', isTemplate: true }));
  await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('created'));
  expect(invalidateProjectsCache).toHaveBeenCalled();
});

it('waits for queued template edits before asking the server to copy it', async () => {
  let finish!: (project: ProjectItem) => void;
  mockProjectsApi.updateProject.mockImplementationOnce(() => new Promise<ProjectItem>(resolve => { finish = resolve; }));
  render(<ProjectsPage canManage />);
  await waitFor(() => expect(screen.getByTestId('projects')).toHaveTextContent('Workflow'));
  fireEvent.click(screen.getByRole('button', { name: 'Edit template' }));
  await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Use template' }));
  expect(mockProjectsApi.createProject).not.toHaveBeenCalled();
  await act(async () => { finish({ ...template, description: 'Latest definition' }); });
  expect(mockProjectsApi.createProject).toHaveBeenCalledWith({ text: 'My project', templateId: 'template' });
  expect(screen.getByTestId('selected')).toHaveTextContent('created');
});

it('persists conversion and clears archival state', async () => {
  render(<ProjectsPage canManage />);
  await waitFor(() => expect(screen.getByTestId('projects')).toHaveTextContent('Workflow'));
  fireEvent.click(screen.getByRole('button', { name: 'Convert to project' }));
  await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledWith('template', {
    isTemplate: false, archived: false, archivedAt: null,
  }));
  await waitFor(() => expect(screen.getByTestId('projects')).toHaveTextContent('"isTemplate":false'));
});

it('does not expose template mutations without management permission', async () => {
  render(<ProjectsPage canManage={false} />);
  await waitFor(() => expect(screen.getByTestId('projects')).toHaveTextContent('Workflow'));
  expect(screen.queryByRole('button', { name: 'Create template' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Use template' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Convert to project' })).not.toBeInTheDocument();
});
