// --- Implementation of new endpoints ---

const API_BASE = '/api/contacts';

export async function inviteContact(contactId: string): Promise<InviteTokenResponse & { inviteLink?: string }> {
  const res = await fetch(`${API_BASE}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to invite contact');
  return res.json();
}

export async function acceptInvite(token: string): Promise<Contact> {
  const res = await fetch(`${API_BASE}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to accept invite');
  return res.json();
}

export async function inviteToGroup(groupId: string, contactId: string): Promise<InviteTokenResponse> {
  const res = await fetch(`${API_BASE}/groups/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, contactId }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to invite to group');
  return res.json();
}

export async function acceptGroupInvite(token: string): Promise<Group> {
  const res = await fetch(`${API_BASE}/groups/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to accept group invite');
  return res.json();
}

export async function leaveGroup(groupId: string): Promise<{ ok: true }> {
  const res = await fetch(`${API_BASE}/groups/${groupId}/leave`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to leave group');
  return res.json();
}
import type {
  Contact,
  InviteToken,
  ContactGroup,
  ContactGroupInput,
  Group,
  InviteTokenResponse,
} from '@myorg/types';

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

  // invitation endpoints
  inviteContact(contactId: string): Promise<InviteTokenResponse>;
  acceptInvite(token: InviteToken): Promise<Contact>;

  // group endpoints
  listGroups(): Promise<Group[]>;
  createGroup(input: ContactGroupInput): Promise<Group>;
  updateGroup(id: string, patch: ContactGroupInput): Promise<Group>;
  deleteGroup(id: string): Promise<void>;
  inviteToGroup(groupId: string, contactId: string): Promise<InviteTokenResponse>;
  acceptGroupInvite(token: InviteToken): Promise<Group>;
  leaveGroup(groupId: string): Promise<{ ok: true }>;
}
