import { jest } from '@jest/globals';

// Mock server-only (Next runtime helper) and auth session to simulate an authenticated user; use the real store.
jest.mock('server-only', () => ({}));
const mockGetContactsSession = jest.fn();
jest.mock('@/lib/server/auth', () => ({
  getContactsSession: () => mockGetContactsSession(),
}));

// Import route handlers after mocking auth
const routes = require('../../app/api/contacts/route');

function makeRequest(body?: any, opts?: { url?: string; headers?: Record<string, string> }) {
  return {
    url: opts?.url || 'http://localhost/api/contacts',
    headers: {
      get: (name: string) => {
        const key = name.toLowerCase();
        if (opts?.headers && opts.headers[key]) return opts.headers[key];
        if (key === 'content-type' && body) return 'application/json';
        return null;
      },
    },
    async json() {
      return body;
    },
  } as unknown as Request;
}

describe('contacts integration (in-memory store)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a contact end-to-end using the in-memory store', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: true, userId: 'test-user' });

    const req = makeRequest({ name: 'Alice' });
    const res = await routes.POST(req);

    if (res.status !== 201) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Expected 201 created; got ${res.status}: ${JSON.stringify(body)}`);
    }

    const created = await res.json();
    expect(created).toHaveProperty('id');
    expect(created.name).toBe('Alice');
  });

  it('lists, updates, and deletes a contact', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: true, userId: 'test-user' });

    const createRes = await routes.POST(makeRequest({ name: 'Bob' }));
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const id = created.id;

    const listRes = await routes.GET(makeRequest());
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(Array.isArray(listBody.contacts)).toBe(true);
    expect(listBody.contacts.find((c: any) => c.id === id)).toBeTruthy();

    const patchRes = await routes.PATCH(makeRequest({ id, patch: { name: 'Bob Updated' } }));
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.name).toBe('Bob Updated');

    const delRes = await routes.DELETE(makeRequest({ id }));
    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.ok).toBe(true);
  });
});
