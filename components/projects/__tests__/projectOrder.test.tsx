import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProjectItem } from '@myorg/types';
import { invalidateProjectsCache, setCachedProjects } from '@/lib/client/projectsCache';
import ProjectsPage from '../ProjectsPage';

jest.mock('@myorg/api-client', () => ({
  createProjectsApiClient: () => mockProjectsApi,
  createContactsApiClient: () => mockContactsApi,
  createTasksApiClient: () => mockTasksApi,
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
  default: ({ projects, onReorder }: {
    projects: ProjectItem[];
    onReorder: (draggedId: string, targetId: string) => void;
  }) => (
    <div>
      <output data-testid="project-order">{projects.map(project => project.id).join(',')}</output>
      <button onClick={() => onReorder('c', 'a')}>Move C before A</button>
      <button onClick={() => onReorder('b', 'c')}>Move B before C</button>
      <button onClick={() => onReorder('a', 'a')}>Drop on itself</button>
    </div>
  ),
}));

const mockProjectsApi = { listProjects: jest.fn(), updateProject: jest.fn() };
const mockContactsApi = { listContacts: jest.fn().mockResolvedValue([]) };
const mockTasksApi = { listTasks: jest.fn().mockResolvedValue([]) };
const projects: ProjectItem[] = ['a', 'b', 'c'].map(id => ({
  id, text: id, color: '#1976D2', avatarUrl: '/project.svg', subprojects: [],
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockProjectsApi.listProjects.mockResolvedValue(projects);
  mockProjectsApi.updateProject.mockImplementation(async (id: string, patch: Partial<ProjectItem>) => ({
    ...projects.find(project => project.id === id), ...patch,
  }));
});

it('updates the UI and cache immediately and serializes rapid reorder saves', async () => {
  let finishFirst!: (project: ProjectItem) => void;
  mockProjectsApi.updateProject.mockImplementationOnce(() => new Promise<ProjectItem>(resolve => {
    finishFirst = resolve;
  }));
  render(<ProjectsPage canManage />);
  await waitFor(() => expect(screen.getByTestId('project-order')).toHaveTextContent('a,b,c'));

  fireEvent.click(screen.getByText('Move C before A'));
  expect(screen.getByTestId('project-order')).toHaveTextContent('c,a,b');
  expect(setCachedProjects).toHaveBeenLastCalledWith([
    { ...projects[2], order: 0 }, { ...projects[0], order: 1 }, { ...projects[1], order: 2 },
  ]);
  await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByText('Move B before C'));
  expect(screen.getByTestId('project-order')).toHaveTextContent('b,c,a');
  expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(1);

  await act(async () => { finishFirst({ ...projects[2]!, order: 0 }); });
  await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(6));
  expect(mockProjectsApi.updateProject.mock.calls).toEqual([
    ['c', { order: 0 }], ['a', { order: 1 }], ['b', { order: 2 }],
    ['b', { order: 0 }], ['c', { order: 1 }], ['a', { order: 2 }],
  ]);
  expect(screen.getByTestId('project-order')).toHaveTextContent('b,c,a');
  expect(invalidateProjectsCache).toHaveBeenCalledTimes(2);
});

it('displays save failures and allows subsequent reorders to save', async () => {
  mockProjectsApi.updateProject.mockRejectedValueOnce(new Error('Could not save order'));
  render(<ProjectsPage canManage />);
  await waitFor(() => expect(screen.getByTestId('project-order')).toHaveTextContent('a,b,c'));
  fireEvent.click(screen.getByText('Move C before A'));
  expect(await screen.findByText('Could not save order')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Move B before C'));
  await waitFor(() => expect(mockProjectsApi.updateProject).toHaveBeenCalledTimes(4));
  expect(mockProjectsApi.updateProject.mock.calls.slice(1)).toEqual([
    ['b', { order: 0 }], ['c', { order: 1 }], ['a', { order: 2 }],
  ]);
});

it.each([true, false])('does not save a no-op drop (canManage: %s)', async canManage => {
  render(<ProjectsPage canManage={canManage} />);
  await waitFor(() => expect(screen.getByTestId('project-order')).toHaveTextContent('a,b,c'));
  fireEvent.click(screen.getByText(canManage ? 'Drop on itself' : 'Move C before A'));
  expect(mockProjectsApi.updateProject).not.toHaveBeenCalled();
  expect(screen.getByTestId('project-order')).toHaveTextContent('a,b,c');
});
