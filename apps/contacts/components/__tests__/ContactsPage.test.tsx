/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactsPage from '../ContactsPage';
import type { Contact } from '@myorg/types';

// mock next/navigation hooks used by the page
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// stub clipboard so addContact uses clipboard instead of prompt
beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
    writable: true,
  });
});

// mock the api client factory
jest.mock('../../lib/client/contactsApi', () => ({
  createContactsApiClient: () => ({
    listContacts: jest.fn().mockResolvedValue([]),
    createContact: jest.fn().mockImplementation(async (data) => ({
      id: '123',
      name: data.name,
      status: 'invited',
      inviteToken: data.inviteToken,
      login: data.login || '',
    })),
    deleteContact: jest.fn().mockResolvedValue(undefined),
    updateContact: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('ContactsPage', () => {
  it('toggles add form and adds a contact', async () => {
    render(<ContactsPage canManage={true} />);

    // loading indicator should show initially
    expect(screen.getByText('Loading contacts…')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Loading contacts…')).not.toBeInTheDocument());

    // initially no contacts, show empty message
    expect(screen.getByText('No contacts yet.')).toBeInTheDocument();

    // open add form
    fireEvent.click(screen.getByRole('button', { name: /Add Contact/i }));
    expect(screen.getByPlaceholderText('e.g. Alex')).toBeInTheDocument();

    // fill in and submit
    fireEvent.change(screen.getByPlaceholderText('e.g. Alex'), { target: { value: 'Foo' } });
    fireEvent.click(screen.getByRole('button', { name: /Add & Copy Invite Link/i }));

    // new contact should appear
    await waitFor(() => expect(screen.getByText('Foo')).toBeInTheDocument());

    // delete the contact
    fireEvent.click(screen.getByLabelText('Remove contact'));
    await waitFor(() => expect(screen.queryByText('Foo')).not.toBeInTheDocument());
  });

  it('refreshes when window gains focus or receives contacts-updated message', async () => {
    const api = require('../../lib/client/contactsApi').createContactsApiClient();
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: 'x', name: 'FocusMe', status: 'accepted' }]);

    render(<ContactsPage canManage={true} />);
    // initial mount triggers list
    await waitFor(() => expect(api.listContacts).toHaveBeenCalledTimes(1));

    // simulate focus
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: 'x', name: 'FocusMe', status: 'accepted' }, { id: 'y', name: 'NewOne', status: 'accepted' }]);
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(screen.getByText('NewOne')).toBeInTheDocument());

    // simulate external notification
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: 'x', name: 'FocusMe', status: 'accepted' }, { id: 'y', name: 'NewOne', status: 'accepted' }, { id: 'z', name: 'FromMsg', status: 'accepted' }]);
    act(() => {
      window.postMessage({ type: 'contacts-updated' }, '*');
    });
    await waitFor(() => expect(screen.getByText('FromMsg')).toBeInTheDocument());
  });

  it('refreshes when a storage event indicates contacts updated', async () => {
    const api = require('../../lib/client/contactsApi').createContactsApiClient();
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: '1', name: 'A', status: 'accepted' }]);
    render(<ContactsPage canManage={true} />);
    await waitFor(() => expect(api.listContacts).toHaveBeenCalledTimes(1));

    (api.listContacts as jest.Mock).mockResolvedValueOnce([
      { id: '1', name: 'A', status: 'accepted' },
      { id: '2', name: 'B', status: 'accepted' },
    ]);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'fomo:contactsUpdated', newValue: '123' }));
    });
    await waitFor(() => expect(screen.getByText('B')).toBeInTheDocument());
  });


  it('replies with thumb-config including current icon', async () => {
    render(<ContactsPage canManage={true} />);
    await waitFor(() => expect(screen.queryByText('Loading contacts…')).not.toBeInTheDocument());

    const msgs: any[] = [];
    window.addEventListener('message', (e) => msgs.push(e.data));

    act(() => {
      window.postMessage({ type: 'get-thumb-config' }, '*');
    });
    await waitFor(() => msgs.some((m) => m.type === 'thumb-config'));
    const cfg = msgs.find((m) => m.type === 'thumb-config');
    expect(cfg.icon).toBe('person_add');
    expect(cfg.action).toBe('thumb-fab');

    // toggle form and request again
    act(() => {
      window.postMessage({ type: 'thumb-fab' }, '*');
    });
    // when form opens icon should change to close
    await waitFor(() => {
      act(() => window.postMessage({ type: 'get-thumb-config' }, '*'));
    });
    const cfg2 = msgs.find((m) => m.type === 'thumb-config' && m.icon === 'close');
    expect(cfg2).toBeDefined();
  });
});
