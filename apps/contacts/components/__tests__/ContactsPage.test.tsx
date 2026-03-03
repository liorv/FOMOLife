/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ContactsPage from '../ContactsPage';
import type { Contact } from '@myorg/types';

// mock next/navigation hooks used by the page
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// stub clipboard and prompt for any interactions
beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
    writable: true,
  });
  jest.spyOn(window, 'prompt').mockImplementation(() => 'Foo');
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
  it('renders without an add-contact button and shows empty state', async () => {
    render(<ContactsPage canManage={true} />);

    // loading indicator should show initially
    expect(screen.getByText('Loading contacts…')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Loading contacts…')).not.toBeInTheDocument());

    // initially no contacts, show empty message
    expect(screen.getByText('No contacts yet.')).toBeInTheDocument();

    // there should be no button for adding contacts
    expect(screen.queryByRole('button', { name: /Add Contact/i })).not.toBeInTheDocument();
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


  it('replies with thumb-config including current icon and creates contact on action', async () => {
    render(<ContactsPage canManage={true} />);
    await waitFor(() => expect(screen.queryByText('Loading contacts…')).not.toBeInTheDocument());

    const msgs: any[] = [];
    window.addEventListener('message', (e) => msgs.push(e.data));
    // verify initial thumb-icon message was posted when component mounted
    await waitFor(() => msgs.some((m) => m.type === 'thumb-icon' && m.icon === 'person_add'));
    act(() => {
      window.postMessage({ type: 'get-thumb-config' }, '*');
    });
    await waitFor(() => msgs.some((m) => m.type === 'thumb-config'));
    const cfg = msgs.find((m) => m.type === 'thumb-config');
    expect(cfg.icon).toBe('person_add');
    expect(cfg.action).toBe('add-contact');

    // sending thumb-fab should not change the configuration (but it does trigger the add behavior)
    act(() => {
      window.postMessage({ type: 'thumb-fab' }, '*');
    });
    await waitFor(() => {
      act(() => window.postMessage({ type: 'get-thumb-config' }, '*'));
    });
    // icon should remain the same
    const cfg2 = msgs.filter((m) => m.type === 'thumb-config').pop();
    expect(cfg2.icon).toBe('person_add');

    // now trigger add-contact action via message
    act(() => {
      window.postMessage({ type: 'add-contact' }, '*');
    });
    await waitFor(() => expect(screen.getByText('Foo')).toBeInTheDocument());
    expect(screen.getByText('Invite link copied to clipboard!')).toBeInTheDocument();

    // also verify legacy thumb-fab still creates a contact
    jest.spyOn(window, 'prompt').mockReturnValue('Bar');
    act(() => {
      window.postMessage({ type: 'thumb-fab' }, '*');
    });
    await waitFor(() => expect(screen.getByText('Bar')).toBeInTheDocument());
  });
});
