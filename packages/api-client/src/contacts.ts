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

// New invitation endpoints for two-phase handshake
export async function generateInviteLink(): Promise<GenerateInviteResponse> {
  return request<GenerateInviteResponse>(`${API_BASE}/invite`, {
    method: 'POST',
    credentials: 'include',
  });
}

export interface ActiveInviteResponse {
  active: boolean;
  inviteLink?: string;
  token?: string;
  expiresAt?: string;
}

export async function getActiveInviteLink(): Promise<ActiveInviteResponse> {
  return request<ActiveInviteResponse>(`${API_BASE}/invite`, {
    credentials: 'include',
  });
}

export async function deleteActiveInviteLink(): Promise<void> {
  await request<void>(`${API_BASE}/invite`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

export async function getInviteDetails(token: string): Promise<InviterProfile> {
  return request<InviterProfile>(`${API_BASE}/invite/${encodeURIComponent(token)}`, {
    credentials: 'include',
  });
}

export async function requestLinkage(token: string): Promise<{ requestId: string }> {
  return request<{ requestId: string }>(`${API_BASE}/request-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    credentials: 'include',
  });
}

export async function getPendingRequests(): Promise<PendingRequestsResponse> {
  return request<PendingRequestsResponse>(`${API_BASE}/pending`, {
    credentials: 'include',
  });
}

export async function approveRequest(requestId: string): Promise<void> {
  await request<void>(`${API_BASE}/approve/${encodeURIComponent(requestId)}`, {
    method: 'PATCH',
    credentials: 'include',
  });
}

export async function rejectRequest(requestId: string): Promise<void> {
  await request<void>(`${API_BASE}/reject/${encodeURIComponent(requestId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
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
  GenerateInviteResponse,
  InviterProfile,
  PendingRequestsResponse,
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
  // Invitation link generation and management
  generateInviteLink(): Promise<GenerateInviteResponse>;
  getActiveInviteLink(): Promise<ActiveInviteResponse>;
  deleteActiveInviteLink(): Promise<void>;
  getInviteDetails(token: string): Promise<InviterProfile>;
  requestLinkage(token: string): Promise<{ requestId: string }>;
  getPendingRequests(): Promise<PendingRequestsResponse>;
  approveRequest(requestId: string): Promise<void>;
  rejectRequest(requestId: string): Promise<void>;

  // Contact CRUD
  listContacts(): Promise<Contact[]>;
  createContact(input: CreateContactRequest): Promise<Contact>;
  updateContact(id: string, patch: UpdateContactRequest): Promise<Contact>;
  deleteContact(id: string): Promise<void>;

  // Group endpoints
  listGroups(): Promise<Group[]>;
  createGroup(input: ContactGroupInput): Promise<Group>;
  updateGroup(id: string, patch: ContactGroupInput): Promise<Group>;
  deleteGroup(id: string): Promise<void>;
  inviteToGroup(groupId: string, contactId: string): Promise<InviteTokenResponse>;
  acceptGroupInvite(token: InviteToken): Promise<Group>;
  leaveGroup(groupId: string): Promise<{ ok: true }>;
}

// Client factory implementation
async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    let body: any;
    try {
      body = (await response.json()) as { error?: string, message?: string };
      if (body.message) {
        message = body.message;
      } else if (body.error) {
        message = body.error;
      }
    } catch {
      // ignore parse error and keep default message
    }
    throw new ApiError(message, response.status, body);
  }
  return (await response.json()) as T;
}

export function createContactsApiClient(baseUrl = ''): ContactsApiClient {
  return {
    async generateInviteLink(): Promise<GenerateInviteResponse> {
      const response = await fetch(`${baseUrl}/api/contacts/invite`, {
        method: 'POST',
        credentials: 'include',
      });
      return parseResponse<GenerateInviteResponse>(response);
    },

    async getActiveInviteLink(): Promise<ActiveInviteResponse> {
      const response = await fetch(`${baseUrl}/api/contacts/invite`, {
        method: 'GET',
        credentials: 'include',
      });
      return parseResponse<ActiveInviteResponse>(response);
    },

    async deleteActiveInviteLink(): Promise<void> {
      const response = await fetch(`${baseUrl}/api/contacts/invite`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return parseResponse<void>(response);
    },

    async getInviteDetails(token: string): Promise<InviterProfile> {
      const response = await fetch(`${baseUrl}/api/contacts/invite/${encodeURIComponent(token)}`, {
        method: 'GET',
        credentials: 'include',
      });
      return parseResponse<InviterProfile>(response);
    },

    async requestLinkage(token: string): Promise<{ requestId: string }> {
      const response = await fetch(`${baseUrl}/api/contacts/request-link`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      return parseResponse<{ requestId: string }>(response);
    },

    async getPendingRequests(): Promise<PendingRequestsResponse> {
      const response = await fetch(`${baseUrl}/api/contacts/pending`, {
        method: 'GET',
        credentials: 'include',
      });
      return parseResponse<PendingRequestsResponse>(response);
    },

    async approveRequest(requestId: string): Promise<void> {
      const response = await fetch(`${baseUrl}/api/contacts/approve/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      return parseResponse<void>(response);
    },

    async rejectRequest(requestId: string): Promise<void> {
      const response = await fetch(`${baseUrl}/api/contacts/reject/${encodeURIComponent(requestId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return parseResponse<void>(response);
    },

    async listContacts(): Promise<Contact[]> {
      const response = await fetch(`${baseUrl}/api/contacts`, {
        method: 'GET',
        credentials: 'include',
      });
      const payload = await parseResponse<ContactsListResponse>(response);
      return payload.contacts;
    },

    async createContact(input: CreateContactRequest): Promise<Contact> {
      const response = await fetch(`${baseUrl}/api/contacts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return parseResponse<Contact>(response);
    },

    async updateContact(id: string, patch: UpdateContactRequest): Promise<Contact> {
      const response = await fetch(`${baseUrl}/api/contacts`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, patch }),
      });
      return parseResponse<Contact>(response);
    },

    async deleteContact(id: string): Promise<void> {
      const response = await fetch(`${baseUrl}/api/contacts`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return parseResponse<void>(response);
    },

    async listGroups(): Promise<Group[]> {
      const response = await fetch(`${baseUrl}/api/contacts/groups`, {
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
      const response = await fetch(`${baseUrl}/api/contacts/groups/${encodeURIComponent(groupId)}/leave`, {
        method: 'POST',
        credentials: 'include',
      });
      return parseResponse<{ ok: true }>(response);
    },
  };
}
