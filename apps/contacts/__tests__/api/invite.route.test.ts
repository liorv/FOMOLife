import { jest } from '@jest/globals';
import { testUserId } from '../../test/fixtures/contacts-fixtures';

const mockGetContactsSession = jest.fn();
const mockInviteContact = jest.fn();
const mockFindInviteByToken = jest.fn();
const mockInvalidateInviteToken = jest.fn();
const mockAcceptInvite = jest.fn();

jest.mock('@/lib/server/auth', () => ({
  getContactsSession: () => mockGetContactsSession(),
}));

jest.mock('@/lib/server/contactsStore', () => ({
  inviteContact: (...args: any[]) => mockInviteContact(...args),
  findInviteByToken: (...args: any[]) => mockFindInviteByToken(...args),
  invalidateInviteToken: (...args: any[]) => mockInvalidateInviteToken(...args),
  acceptInvite: (...args: any[]) => mockAcceptInvite(...args),
}));

const inviteRoute = require('../../app/api/contacts/invite/route');
const inviteTokenRoute = require('../../app/api/contacts/invite/[token]/route');
const acceptRoute = require('../../app/api/contacts/accept/route');

function makeRequest(body?: any, opts?: { url?: string; headers?: Record<string, string> }) {
  return {
    url: opts?.url || 'http://localhost/api/contacts/invite',
    headers: { get: (name: string) => (opts?.headers?.[name.toLowerCase()] ?? (body ? 'application/json' : null)) },
    async json() { return body; },
  } as unknown as Request;
}

describe('contacts invite API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POST /invite returns token when authenticated', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    mockInviteContact.mockResolvedValue('token-123');

    const res = await inviteRoute.POST(makeRequest({ contactId: 'c1' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('inviteToken', 'token-123');
  });

  it('GET /invite/[token] returns 404 for invalid token', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: false });
    mockFindInviteByToken.mockResolvedValue(null);

    const res = await inviteTokenRoute.GET(makeRequest(), { params: { token: 'nope' } });
    expect(res.status).toBe(404);
  });

  it('DELETE /invite/[token] invalidates token', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: false });
    mockFindInviteByToken.mockResolvedValue({});
    mockInvalidateInviteToken.mockResolvedValue(true);

    const res = await inviteTokenRoute.DELETE(makeRequest(), { params: { token: 't1' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('POST /accept handles missing token', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });

    const res = await acceptRoute.POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
