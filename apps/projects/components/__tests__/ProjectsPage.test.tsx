/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
// Import ProjectsPage after mocks below (use require) so module factories can be hoisted
let ProjectsPage: any;
import type { ProjectItem, Contact } from '@myorg/types';

// mocks
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const projectsListMock = jest.fn().mockResolvedValue([]);
const contactsListMock = jest.fn().mockResolvedValue([]);
const contactsCreateMock = jest.fn().mockImplementation(async (input) => ({
  id: 'c2',
  name: input.name,
  status: 'not_linked',
  createProjectsApiClient: () => ({
    listProjects: projectsListMock,
    createProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
  }),
}));

jest.mock('../../contacts/lib/client/contactsApi', () => ({
  createContactsApiClient: () => ({
    listContacts: contactsListMock,
    createContact: contactsCreateMock,
  }),
}));

// Mock projects API client used by the component directly (avoid fetch stubs)
jest.mock('../../lib/client/projectsApi', () => ({
  createProjectsApiClient: () => ({
    listProjects: projectsListMock,
    createProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
  }),
}));

// Mock projects API client used by the component
// Use a fetch stub in tests so the component's client calls succeed
ProjectsPage = require('../ProjectsPage').default;

const sampleProject: ProjectItem = {
  id: 'p1',
  text: 'Sample',
  color: '',
  progress: 0,
  order: 0,
  subprojects: [],
};

describe('ProjectsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    projectsListMock.mockResolvedValue([sampleProject]);
    contactsListMock.mockResolvedValue([{ id: 'c1', name: 'John Doe', status: 'linked' }]);
    // No global.fetch stub needed; projects client mocked above
  });
  it('loads and displays projects from the API', async () => {
    render(<ProjectsPage canManage={true} />);
    await waitFor(() => expect(screen.getByText('Sample')).toBeInTheDocument());
  });
});
