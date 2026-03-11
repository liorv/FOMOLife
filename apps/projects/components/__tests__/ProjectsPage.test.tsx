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
    // Stub global.fetch for createProjectsApiClient usage
    // Return project list for requests to /api/projects as a real Response
    global.fetch = jest.fn(async (input) => {
      let url = '';
      if (typeof input === 'string') url = input;
      else if (typeof Request !== 'undefined' && input instanceof Request) url = input.url;
      else if (typeof URL !== 'undefined' && input instanceof URL) url = input.href;
      else if (input && typeof (input as any).url === 'string') url = (input as any).url;
      else url = String(input || '');

      if (url.includes('/api/projects')) {
        return new Response(JSON.stringify({ projects: [sampleProject] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof global.fetch;
  });
  it('loads and displays projects from the API', async () => {
    render(<ProjectsPage canManage={true} />);
    await waitFor(() => expect(screen.getByText('Sample')).toBeInTheDocument());
  });
});
