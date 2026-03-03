/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ContactsPage, { DEFAULT_CONTACT_NAME } from '../ContactsPage';
import type { Contact } from '@myorg/types';

// mock next/navigation hooks used by the page
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// no clipboard or prompt interactions expected in new flow
beforeEach(() => {
  jest.spyOn(window, 'prompt').mockImplementation(() => {
    throw new Error('prompt should not be called');
  });
});

// mock the api client factory
jest.mock('../../lib/client/contactsApi', () => ({
  createContactsApiClient: () => ({
    listContacts: jest.fn().mockResolvedValue([]),
    createContact: jest.fn().mockImplementation(async (data) => ({
      id: '123',
      name: data.name,
      status: 'not_linked',
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
    expect(screen.getByText(/add button/i)).toBeInTheDocument();

    // there should be no button for adding contacts
    expect(screen.queryByRole('button', { name: /Add Contact/i })).not.toBeInTheDocument();
  });

  it('refreshes when window gains focus or receives contacts-updated message', async () => {
    const api = require('../../lib/client/contactsApi').createContactsApiClient();
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: 'x', name: 'FocusMe', status: 'linked' }]);

    render(<ContactsPage canManage={true} />);
    // initial mount triggers list
    await waitFor(() => expect(api.listContacts).toHaveBeenCalledTimes(1));

    // simulate focus
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: 'x', name: 'FocusMe', status: 'linked' }, { id: 'y', name: 'NewOne', status: 'linked' }]);
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(screen.getByText('NewOne')).toBeInTheDocument());

    // simulate external notification
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: 'x', name: 'FocusMe', status: 'linked' }, { id: 'y', name: 'NewOne', status: 'linked' }, { id: 'z', name: 'FromMsg', status: 'linked' }]);
    act(() => {
      window.postMessage({ type: 'contacts-updated' }, '*');
    });
    await waitFor(() => expect(screen.getByText('FromMsg')).toBeInTheDocument());
  });

  it('refreshes when a storage event indicates contacts updated', async () => {
    const api = require('../../lib/client/contactsApi').createContactsApiClient();
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: '1', name: 'A', status: 'linked' }]);
    render(<ContactsPage canManage={true} />);
    await waitFor(() => expect(api.listContacts).toHaveBeenCalledTimes(1));

    (api.listContacts as jest.Mock).mockResolvedValueOnce([
      { id: '1', name: 'A', status: 'linked' },
      { id: '2', name: 'B', status: 'linked' },
    ]);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'fomo:contactsUpdated', newValue: '123' }));
    });
    await waitFor(() => expect(screen.getByText('B')).toBeInTheDocument());
  });


  it('replies with thumb-config and creates a new contact with focus when thumb is pressed', async () => {
    render(<ContactsPage canManage={true} />);
    await waitFor(() => expect(screen.queryByText('Loading contacts…')).not.toBeInTheDocument());

    const msgs: any[] = [];
    window.addEventListener('message', (e) => msgs.push(e.data));
    // initial thumb-icon message
    await waitFor(() => msgs.some((m) => m.type === 'thumb-icon' && m.icon === 'person_add'));
    act(() => window.postMessage({ type: 'get-thumb-config' }, '*'));
    await waitFor(() => msgs.some((m) => m.type === 'thumb-config'));
    const cfg = msgs.find((m) => m.type === 'thumb-config');
    expect(cfg.icon).toBe('person_add');
    expect(cfg.action).toBe('add-contact');

    // press thumb-fab (legacy) and verify contact added with default name and focused input
    act(() => window.postMessage({ type: 'thumb-fab' }, '*'));
    await waitFor(() => expect(screen.getByDisplayValue(DEFAULT_CONTACT_NAME)).toBeInTheDocument());
    const input = screen.getByDisplayValue(DEFAULT_CONTACT_NAME);
    expect(input).toHaveFocus();

    // status should initially be "Not Linked" (and no banner is shown)
    expect(screen.getByText('Not Linked')).toBeInTheDocument();
    expect(screen.queryByText('Invite link copied to clipboard!')).not.toBeInTheDocument();

    // also try the explicit add-contact action; should append another tile
    act(() => window.postMessage({ type: 'add-contact' }, '*'));
    await waitFor(() => expect(screen.getAllByDisplayValue(DEFAULT_CONTACT_NAME).length).toBe(2));
  });

  it('delete button removes contact and link button generates invite token', async () => {
    // prepare API client spies
    const api = require('../../lib/client/contactsApi').createContactsApiClient();
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: 'c1', name: 'A', status: 'not_linked' }]);
    (api.deleteContact as jest.Mock).mockResolvedValue(undefined);
    (api.inviteContact as jest.Mock).mockResolvedValue({ inviteToken: 'tkn', inviteLink: 'http://app/accept?token=tkn' });

    render(<ContactsPage canManage={true} />);
    await waitFor(() => expect(api.listContacts).toHaveBeenCalledTimes(1));

    // delete button should exist and remove entry
    const deleteBtn = await screen.findByLabelText('Delete contact');
    act(() => deleteBtn.click());
    await waitFor(() => expect(screen.queryByText('A')).not.toBeInTheDocument());

    // add again to test invite generation
    act(() => window.postMessage({ type: 'add-contact' }, '*'));
    await waitFor(() => expect(screen.getByDisplayValue(DEFAULT_CONTACT_NAME)).toBeInTheDocument());
    const inviteBtn = screen.getByLabelText('Generate invite link');
    act(() => inviteBtn.click());
    await waitFor(() => expect(api.inviteContact).toHaveBeenCalledWith('c1'));
    // status should have updated locally to link_pending
    expect(screen.getByText('Link Pending')).toBeInTheDocument();
  });
});
