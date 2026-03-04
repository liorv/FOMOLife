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
    status;
    body;
    constructor(message, status, body) {
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
async function request(path, options = {}, defaultMsg) {
    let res;
    try {
        res = await fetch(path, options);
    }
    catch (err) {
        // network error / DNS failure
        const msg = err instanceof Error ? err.message : String(err);
        throw new ApiError(`Network error: ${msg}`, undefined, err);
    }
    if (!res.ok) {
        let msg = defaultMsg ?? `HTTP ${res.status}`;
        let body;
        try {
            body = await res.json();
            if (body?.message)
                msg = body.message;
            else if (body?.error)
                msg = body.error;
        }
        catch {
            // ignore parse errors
        }
        throw new ApiError(msg, res.status, body);
    }
    return res.json();
}
// CRUD helpers -----------------------------------------------------------
export async function listContacts() {
    const resp = await request(API_BASE, {
        credentials: 'include',
    });
    return resp.contacts;
}
export async function createContact(input) {
    return request(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        credentials: 'include',
    });
}
export async function updateContact(id, patch) {
    return request(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
        credentials: 'include',
    });
}
export async function deleteContact(id) {
    await request(`${API_BASE}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    });
}
// invitation endpoints --------------------------------------------------
export async function inviteContact(contactId) {
    return request(`${API_BASE}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
        credentials: 'include',
    });
}
export async function inviteInfo(token) {
    return request(`${API_BASE}/invite/${encodeURIComponent(token)}`, undefined, 'invalid invite');
}
// reject/clear a token without linking anything
export async function rejectInvite(token) {
    await request(`${API_BASE}/invite/${encodeURIComponent(token)}`, {
        method: 'DELETE',
        credentials: 'include',
    });
}
export async function acceptInvite(token) {
    return request(`${API_BASE}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include',
    });
}
// group endpoints -------------------------------------------------------
export async function inviteToGroup(groupId, contactId) {
    return request(`${API_BASE}/groups/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, contactId }),
        credentials: 'include',
    });
}
export async function acceptGroupInvite(token) {
    return request(`${API_BASE}/groups/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include',
    });
}
export async function leaveGroup(groupId) {
    return request(`${API_BASE}/groups/${groupId}/leave`, {
        method: 'POST',
        credentials: 'include',
    });
}
