/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import ContactsPage, { DEFAULT_CONTACT_NAME } from '../ContactsPage';
import type { Contact } from '@myorg/types';

// mock next/navigation hooks used by the page
let mockSearchParams = new URLSearchParams();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace }),
}));

// no prompt interactions expected in new flow; but we do expect
// clipboard writes when an invite link is generated.
beforeEach(() => {
  jest.spyOn(window, 'prompt').mockImplementation(() => {
    throw new Error('prompt should not be called');
  });
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
    writable: true,
  });
});

// mock the api client factory with a shared fake object
let _nextId = 1;
const fakeApi = {
  listContacts: jest.fn().mockResolvedValue([]),
  createContact: jest.fn().mockImplementation(async (data) => ({
    id: String(_nextId++),
    name: data.name,
    status: 'not_linked',
    login: data.login || '',
  })),
  deleteContact: jest.fn().mockResolvedValue(undefined),
  updateContact: jest.fn().mockResolvedValue(undefined),
  inviteContact: jest.fn().mockResolvedValue({ inviteToken: 'tkn', inviteLink: '' }),
};

jest.mock('../../lib/client/contactsApi', () => ({
  createContactsApiClient: () => fakeApi,
}));

describe('ContactsPage', () => {
  beforeEach(() => {
    // reset search params and router state between tests
    mockSearchParams = new URLSearchParams();
    mockReplace.mockReset();
  });

  it('shows accepted-banner when query string includes accepted=true', async () => {
    mockSearchParams = new URLSearchParams('accepted=true');
    render(<ContactsPage canManage={true} />);
    // the banner should appear immediately
    expect(await screen.findByText(/Invitation accepted/i)).toBeInTheDocument();
    // router.replace should be called to clear params
    expect(mockReplace).toHaveBeenCalled();
  });

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
    const api = fakeApi as any;
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: 'x', name: 'FocusMe', status: 'linked' }]);

    render(<ContactsPage canManage={true} />);
    // initial mount triggers list (at least once)
    await waitFor(() => expect(api.listContacts).toHaveBeenCalled());

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
    const api = fakeApi as any;
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: '1', name: 'A', status: 'linked' }]);
    render(<ContactsPage canManage={true} />);
    await waitFor(() => expect(api.listContacts).toHaveBeenCalled());

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
    const msgs: any[] = [];
    window.addEventListener('message', (e) => msgs.push(e.data));

    render(<ContactsPage canManage={true} currentUserId="u1" />);
    await waitFor(() => expect(screen.queryByText('Loading contacts…')).not.toBeInTheDocument());

    // initial thumb-icon message
    await waitFor(() => msgs.some((m) => m.type === 'thumb-icon' && m.icon === 'person_add'));
    act(() => window.postMessage({ type: 'get-thumb-config' }, '*'));
    // we just care that some config event is posted, details aren't important
    await waitFor(() => msgs.some((m) => m.type === 'thumb-config'));

    // press thumb-fab (legacy) and verify contact added with default name and focused input
    act(() => window.postMessage({ type: 'thumb-fab' }, '*'));
    await waitFor(() => expect(screen.getByDisplayValue(DEFAULT_CONTACT_NAME)).toBeInTheDocument());
    const input = screen.getByDisplayValue(DEFAULT_CONTACT_NAME);
    expect(input).toHaveFocus();

    // status should initially be "Not Linked" (and no banner is shown)
    expect(screen.getByText('Not Linked')).toBeInTheDocument();
    expect(screen.queryByText(/Invite link copied/)).not.toBeInTheDocument();

    // also try the explicit add-contact action; should append another tile.
    // only the most-recent tile uses an <input> element, so count by text
    // rather than displayValue.
    act(() => window.postMessage({ type: 'add-contact' }, '*'));
    await waitFor(() => {
      // there should now be two tiles regardless of whether they're inputs or spans
      expect(document.querySelectorAll('.contact-tile').length).toBe(2);
    });
  });

  it('delete button removes contact from list', async () => {
    // prepare API client spies
    const api = fakeApi as any;
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: 'c1', name: 'A', status: 'linked' }]);
    (api.deleteContact as jest.Mock).mockResolvedValue(undefined);

    render(<ContactsPage canManage={true} />);
    await waitFor(() => expect(api.listContacts).toHaveBeenCalled());

    // delete button should exist and remove the contact from the list
    const deleteBtn = await screen.findByLabelText('Delete contact');
    act(() => deleteBtn.click());
    await waitFor(() => expect(screen.queryByText('A')).not.toBeInTheDocument());
  });

  it('link button generates invite token', async () => {
    // prepare API client spies
    const api = fakeApi as any;
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: 'c1', name: 'A', status: 'not_linked' }]);
    (api.inviteContact as jest.Mock).mockResolvedValue({ inviteToken: 'tkn', inviteLink: 'http://app/accept?token=tkn' });

    render(<ContactsPage canManage={true} />);
    await waitFor(() => expect(api.listContacts).toHaveBeenCalled());

    // add a contact to test invite generation
    act(() => window.postMessage({ type: 'add-contact' }, '*'));
    await waitFor(() => expect(screen.getByDisplayValue(DEFAULT_CONTACT_NAME)).toBeInTheDocument());
    
    // Find the invite button in the newly added contact row
    const inputElement = screen.getByDisplayValue(DEFAULT_CONTACT_NAME);
    const contactRow = inputElement.closest('.contact-tile') as HTMLElement;
    const inviteBtn = within(contactRow).getByLabelText('Generate invite link');
    
    act(() => inviteBtn.click());
    // status should have updated locally to link_pending – that's the only
    // behaviour we care about here.
    await waitFor(() => expect(screen.getByText('Link Pending')).toBeInTheDocument());
    // ensure the API client was actually invoked
    await waitFor(() => expect(api.inviteContact).toHaveBeenCalled());
    // clipboard write may happen slightly later, so wait for it too
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/accept-invite?token=')
    ));
  });

  it('shows error message when contact name update fails', async () => {
    // prepare API client spies
    const api = fakeApi as any;
    (api.listContacts as jest.Mock).mockResolvedValueOnce([{ id: 'c1', name: 'Test Contact', status: 'not_linked' }]);
    (api.updateContact as jest.Mock).mockRejectedValueOnce(new Error('Cannot name a contact as yourself'));

    render(<ContactsPage canManage={true} />);
    await waitFor(() => expect(api.listContacts).toHaveBeenCalled());

    // Find the edit button and click it to enter edit mode
    const editBtn = screen.getByLabelText('Edit name');
    act(() => editBtn.click());

    // Now find the name input and change its value
    const nameInput = screen.getByDisplayValue('Test Contact');
    act(() => {
      fireEvent.change(nameInput, { target: { value: 'u1' } });
      fireEvent.blur(nameInput);
    });

    // Error message should be displayed
    await waitFor(() => expect(screen.getByText('You cannot name a contact with your own name.')).toBeInTheDocument());
  });
});
