import type { Contact, InviteToken } from '@myorg/types';

export type ContactsAuthMode = 'none' | 'mock-cookie';

export interface ContactsListResponse {
  contacts: Contact[];
}

export interface CreateContactRequest {
  name: string;
  login?: string;
  inviteToken?: InviteToken | null;
}

export interface UpdateContactRequest {
  name?: string;
  login?: string;
  status?: Contact['status'];
  inviteToken?: InviteToken | null;
}

export interface DeleteContactRequest {
  id: string;
}

export interface ContactsApiClient {
  listContacts(): Promise<Contact[]>;
  createContact(input: CreateContactRequest): Promise<Contact>;
  updateContact(id: string, patch: UpdateContactRequest): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
}
