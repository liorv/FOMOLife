/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ProjectsPage from '../ProjectsPage';
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
  });

  it('creates a new contact when adding unknown person to a task', async () => {
    const storageSpy = jest.spyOn(Storage.prototype, 'setItem');
    render(<ProjectsPage canManage={true} />);
    // wait for initial load and project tile
    await waitFor(() => expect(screen.getByText('Sample')).toBeInTheDocument());

    // open project
    fireEvent.click(screen.getByText('Sample'));
    // open task editor by adding a new task
    const addBar = screen.getByPlaceholderText(/search people/i, { exact: false });
    // wait existing
    // Because ProjectsPage includes complex nested components, we simply use the same flow as TasksPage

    // open inline editor on project default list by clicking on empty area?
    // easier: find "add a new task" input and type then press Enter to create task
    const taskInput = screen.getByPlaceholderText('Add a new task (press Enter)');
    fireEvent.change(taskInput, { target: { value: 'x' } });
    fireEvent.keyDown(taskInput, { key: 'Enter' });
    // now click task in list
    await waitFor(() => expect(screen.getByText('x')).toBeInTheDocument());
    fireEvent.click(screen.getByText('x'));
    
    // type person name unknown
    const personInput = await screen.findByPlaceholderText(/search people/i);
    fireEvent.change(personInput, { target: { value: 'Jane' } });
    const suggestion = await screen.findByText('Add "Jane"');
    fireEvent.click(suggestion);

    await waitFor(() => {
      expect(contactsCreateMock).toHaveBeenCalledWith({ name: 'Jane' });
      expect(storageSpy).toHaveBeenCalledWith('fomo:contactsUpdated', expect.any(String));
    });
  });
});
