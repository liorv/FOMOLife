/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TasksPage from '../TasksPage';
import type { TaskItem } from '@myorg/types';

// mock next/navigation hooks used by the page
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// also mock contacts client so TasksPage has a people list
const contactsListMock = jest.fn().mockResolvedValue([
  { id: 'c1', name: 'John Doe', status: 'linked' },
]);
const contactsCreateMock = jest.fn().mockImplementation(async (input) => ({
  id: 'c2',
  name: input.name,
  status: 'not_linked',
}));

jest.mock('../../lib/client/contactsApi', () => ({
  createContactsApiClient: () => ({
    listContacts: contactsListMock,
    createContact: contactsCreateMock,
  }),
}));

const listMock = jest.fn().mockResolvedValue([]);
const createMock = jest.fn().mockImplementation(async (data) => ({
  id: 't1',
  text: data.text,
  favorite: data.favorite || false,
  description: data.description || '',
}));
const updateMock = jest.fn().mockResolvedValue(undefined);
const deleteMock = jest.fn().mockResolvedValue(undefined);

jest.mock('../../lib/client/tasksApi', () => ({
  createTasksApiClient: () => ({
    listTasks: listMock,
    createTask: createMock,
    updateTask: updateMock,
    deleteTask: deleteMock,
  }),
}));

describe('TasksPage', () => {
  it('renders loading then allows adding tasks', async () => {
    render(<TasksPage canManage={true} />);
    expect(screen.getByText('Loading tasks…')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('Loading tasks…')).not.toBeInTheDocument());

    const input = screen.getByPlaceholderText('Add a new task (press Enter)');

    // pressing enter with empty input should do nothing
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Buy milk' } });
    // press enter to add
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('Buy milk')).toBeInTheDocument());
  });

  it('sends people when updating task through editor', async () => {
    const storageSpy = jest.spyOn(Storage.prototype, 'setItem');
    // ensure contacts service returns empty list for this scenario so
    // selecting the suggestion triggers the "create and add" flow
    contactsListMock.mockResolvedValueOnce([]);
    // seed list with one task
    listMock.mockResolvedValueOnce([
      { id: 'a', text: 'foo', done: false, dueDate: null, favorite: false, description: '' },
    ]);

    render(<TasksPage canManage={true} />);
    await waitFor(() => expect(screen.queryByText('Loading tasks…')).not.toBeInTheDocument());

    // open inline editor by clicking the task row
    fireEvent.click(screen.getByText('foo'));

    // type in people search box inside editor
    const personInput = await screen.findByPlaceholderText(/search people/i);
    fireEvent.change(personInput, { target: { value: 'John' } });

    // suggestion dropdown should show the inline "Add" option when no
    // contacts are returned by the service
    const suggestion = await screen.findByText(/Add "John"/i);
    fireEvent.click(suggestion);

    // after click, component should have called updateTask with people
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ people: [{ name: 'John' }] }),
      );
    });

    // unknown person should have triggered contact creation
    expect(contactsCreateMock).toHaveBeenCalledWith({ name: 'John' });
    expect(storageSpy).toHaveBeenCalledWith('fomo:contactsUpdated', expect.any(String));
  });

});
