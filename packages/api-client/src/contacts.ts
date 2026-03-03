// --- Implementation of new endpoints with fault tolerance and error helpers ---

const API_BASE = '/api/contacts';

/**
 * Error type thrown when an HTTP request fails.  Contains the
 * optional status code and parsed body to help callers make
 * decisions or report diagnostics.
 */
export class ApiError extends Error {
  // exactOptionalPropertyTypes is enabled in this project; an
  // optional property is treated as `T | undefined`.  to avoid
  // a mismatch when assigning in the constructor we declare the
  // union explicitly.
  status: number | undefined;
  body: any | undefined;

  constructor(message: string, status?: number, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Centralized fetch wrapper that treats network failures and
 * non-2xx responses uniformly.  It will attempt to parse a JSON
 * body and extract `message`/`error` fields to create a
 * user‑friendly message.  A caller can override the default
 * error message with `defaultMsg`.
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
  defaultMsg?: string
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, options);
  } catch (err: any) {
    // network error / DNS failure
    const msg = err instanceof Error ? err.message : String(err);
    throw new ApiError(`Network error: ${msg}`, undefined, err);
  }

  if (!res.ok) {
    let msg = defaultMsg ?? `HTTP ${res.status}`;
    let body: any;
    try {
      body = await res.json();
      if (body?.message) msg = body.message;
      else if (body?.error) msg = body.error;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(msg, res.status, body);
  }

  return res.json();
}

// metadata about a pending invite token; does not consume it
export interface InviteInfo {
  inviterName: string;
  contactName: string;
  /** true when the current user is the one who generated the invite */
  selfInvite?: boolean;
}

// CRUD helpers -----------------------------------------------------------
export async function listContacts(): Promise<Contact[]> {
  const resp = await request<ContactsListResponse>(API_BASE, {
    credentials: 'include',
  });
  return resp.contacts;
}

export async function createContact(input: CreateContactRequest): Promise<Contact> {
  return request<Contact>(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });
}

export async function updateContact(
  id: string,
  patch: UpdateContactRequest
): Promise<Contact> {
  return request<Contact>(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
    credentials: 'include',
  });
}

export async function deleteContact(id: string): Promise<void> {
  await request<void>(`${API_BASE}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

// invitation endpoints --------------------------------------------------
export async function inviteContact(
  contactId: string
): Promise<InviteTokenResponse & { inviteLink?: string }> {
  return request<InviteTokenResponse & { inviteLink?: string }>(
    `${API_BASE}/invite`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId }),
      credentials: 'include',
    }
  );
}

export async function inviteInfo(token: string): Promise<InviteInfo> {
  return request<InviteInfo>(
    `${API_BASE}/invite/${encodeURIComponent(token)}`,
    undefined,
    'invalid invite'
  );
}

// reject/clear a token without linking anything
export async function rejectInvite(token: string): Promise<void> {
  await request<void>(
    `${API_BASE}/invite/${encodeURIComponent(token)}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );
}

export async function acceptInvite(token: string): Promise<Contact> {
  return request<Contact>(`${API_BASE}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    credentials: 'include',
  });
}

// group endpoints -------------------------------------------------------
export async function inviteToGroup(
  groupId: string,
  contactId: string
): Promise<InviteTokenResponse> {
  return request<InviteTokenResponse>(
    `${API_BASE}/groups/invite`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, contactId }),
      credentials: 'include',
    }
  );
}

export async function acceptGroupInvite(token: string): Promise<Group> {
  return request<Group>(`${API_BASE}/groups/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    credentials: 'include',
  });
}

export async function leaveGroup(groupId: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`${API_BASE}/groups/${groupId}/leave`, {
    method: 'POST',
    credentials: 'include',
  });
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
  inviteInfo(token: string): Promise<InviteInfo>;
  rejectInvite(token: string): Promise<void>;
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
