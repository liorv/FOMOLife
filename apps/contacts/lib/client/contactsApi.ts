import type {
  ContactsApiClient,
  ContactsListResponse,
  CreateContactRequest,
  UpdateContactRequest,
} from '@myorg/api-client';
import type { Contact, ContactGroupInput, Group, InviteToken, InviteTokenResponse } from '@myorg/types';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore parse error and keep default message
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function createContactsApiClient(baseUrl = ''): ContactsApiClient {
  return {
    async listContacts(): Promise<Contact[]> {
      const response = await fetch(`${baseUrl}/api/contacts`, { method: 'GET', credentials: 'include' });
      const payload = await parseResponse<ContactsListResponse>(response);
      return payload.contacts;
    },

    async createContact(input: CreateContactRequest): Promise<Contact> {
      const response = await fetch(`${baseUrl}/api/contacts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      return parseResponse<Contact>(response);
    },

    async updateContact(id: string, patch: UpdateContactRequest): Promise<Contact> {
      const response = await fetch(`${baseUrl}/api/contacts`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, patch }),
      });
      return parseResponse<Contact>(response);
    },

    async deleteContact(id: string): Promise<void> {
      const response = await fetch(`${baseUrl}/api/contacts`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await parseResponse<{ ok: true }>(response);
    },

    async inviteContact(contactId: string): Promise<InviteTokenResponse> {
      const response = await fetch(`${baseUrl}/api/contacts/invite`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contactId }),
      });
      return parseResponse<InviteTokenResponse>(response);
    },

    async acceptInvite(token: InviteToken): Promise<Contact> {
      const response = await fetch(`${baseUrl}/api/contacts/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      return parseResponse<Contact>(response);
    },

    async listGroups(): Promise<Group[]> {
      const response = await fetch(`${baseUrl}/api/contacts/groups`, {
        method: 'GET',
        credentials: 'include',
      });
      const payload = await parseResponse<{ groups: Group[] }>(response);
      return payload.groups;
    },

    async createGroup(input: ContactGroupInput): Promise<Group> {
      const response = await fetch(`${baseUrl}/api/contacts/groups`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      return parseResponse<Group>(response);
    },

    async updateGroup(id: string, patch: ContactGroupInput): Promise<Group> {
      const response = await fetch(`${baseUrl}/api/contacts/groups`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, patch }),
      });
      return parseResponse<Group>(response);
    },

    async deleteGroup(id: string): Promise<void> {
      const response = await fetch(`${baseUrl}/api/contacts/groups`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await parseResponse<{ ok: true }>(response);
    },

    async inviteToGroup(groupId: string, contactId: string): Promise<InviteTokenResponse> {
      const response = await fetch(`${baseUrl}/api/contacts/groups/invite`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ groupId, contactId }),
      });
      return parseResponse<InviteTokenResponse>(response);
    },

    async acceptGroupInvite(token: InviteToken): Promise<Group> {
      const response = await fetch(`${baseUrl}/api/contacts/groups/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      return parseResponse<Group>(response);
    },

    async leaveGroup(groupId: string): Promise<{ ok: true }> {
      const response = await fetch(`${baseUrl}/api/contacts/groups/${groupId}/leave`, {
        method: 'POST',
        credentials: 'include',
      });
      return parseResponse<{ ok: true }>(response);
    },
  };
}
