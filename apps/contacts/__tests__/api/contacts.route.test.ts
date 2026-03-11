import { jest } from '@jest/globals';
import { sampleContacts, testUserId, createdContact } from '../../test/fixtures/contacts-fixtures';

// Mocks for auth and contactsStore
const mockGetContactsSession = jest.fn();
const mockListContacts = jest.fn();
const mockCreateContact = jest.fn();

jest.mock('@/lib/server/auth', () => ({
  getContactsSession: () => mockGetContactsSession(),
}));

jest.mock('@/lib/server/contactsStore', () => ({
  listContacts: (...args: any[]) => mockListContacts(...args),
  createContact: (...args: any[]) => mockCreateContact(...args),
  updateContact: jest.fn(),
  deleteContact: jest.fn(),
}));

// Import the route handlers after the mocks
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

describe('contacts API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns contacts when authenticated', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    mockListContacts.mockResolvedValue(sampleContacts);

    const res = await routes.GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ contacts: sampleContacts });
  });

  it('GET returns 401 when unauthenticated', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: false });

    const res = await routes.GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('POST creates contact when authenticated', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    const newContact = createdContact('Charlie');
    mockCreateContact.mockResolvedValue(newContact);

    const res = await routes.POST(makeRequest({ name: 'Charlie' }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toEqual(newContact);
  });

  it('POST validates missing name', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });

    const res = await routes.POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });
});
