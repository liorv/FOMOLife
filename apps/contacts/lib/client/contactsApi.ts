import type {
  ContactsApiClient,
  ContactsListResponse,
  CreateContactRequest,
  UpdateContactRequest,
} from '@myorg/api-client';
import type { Contact } from '@myorg/types';

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
      const response = await fetch(`${baseUrl}/api/contacts`, { method: 'GET' });
      const payload = await parseResponse<ContactsListResponse>(response);
      return payload.contacts;
    },

    async createContact(input: CreateContactRequest): Promise<Contact> {
      const response = await fetch(`${baseUrl}/api/contacts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      return parseResponse<Contact>(response);
    },

    async updateContact(id: string, patch: UpdateContactRequest): Promise<Contact> {
      const response = await fetch(`${baseUrl}/api/contacts`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, patch }),
      });
      return parseResponse<Contact>(response);
    },

    async deleteContact(id: string): Promise<void> {
      const response = await fetch(`${baseUrl}/api/contacts`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await parseResponse<{ ok: true }>(response);
    },
  };
}
