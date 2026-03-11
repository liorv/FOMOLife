import { jest } from '@jest/globals';
import { testUserId } from '../../test/fixtures/contacts-fixtures';

const mockGetContactsSession = jest.fn();
const mockListGroups = jest.fn();
const mockCreateGroup = jest.fn();
const mockUpdateGroup = jest.fn();
const mockDeleteGroup = jest.fn();

jest.mock('@/lib/server/auth', () => ({
  getContactsSession: () => mockGetContactsSession(),
}));

jest.mock('@/lib/server/contactsStore', () => ({
  listGroups: (...args: any[]) => mockListGroups(...args),
  createGroup: (...args: any[]) => mockCreateGroup(...args),
  updateGroup: (...args: any[]) => mockUpdateGroup(...args),
  deleteGroup: (...args: any[]) => mockDeleteGroup(...args),
  leaveGroup: jest.fn(),
}));

const routes = require('../../app/api/contacts/groups/route');
const leaveRoute = require('../../app/api/contacts/groups/[id]/leave/route');

function makeRequest(body?: any, opts?: { url?: string; headers?: Record<string, string> }) {
  return {
    url: opts?.url || 'http://localhost/api/contacts/groups',
    headers: { get: (name: string) => (opts?.headers?.[name.toLowerCase()] ?? (body ? 'application/json' : null)) },
    async json() { return body; },
  } as unknown as Request;
}

describe('contacts groups API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET groups when authenticated', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    const groups = [{ id: 'g1', name: 'Friends', contactIds: [] }];
    mockListGroups.mockResolvedValue(groups);

    const res = await routes.GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ groups });
  });

  it('POST creates group', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    const created = { id: 'g2', name: 'Team', contactIds: ['c1'] };
    mockCreateGroup.mockResolvedValue(created);

    const res = await routes.POST(makeRequest({ name: 'Team', contactIds: ['c1'] }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
  });

  it('PATCH updates group', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    const updated = { id: 'g1', name: 'Friends Updated', contactIds: [] };
    mockUpdateGroup.mockResolvedValue(updated);

    const res = await routes.PATCH(makeRequest({ id: 'g1', patch: { name: 'Friends Updated' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
  });

  it('DELETE removes group', async () => {
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });
    mockDeleteGroup.mockResolvedValue(true);

    const res = await routes.DELETE(makeRequest({ id: 'g1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('POST /groups/[id]/leave requires auth and works', async () => {
    const mockLeave = jest.fn().mockResolvedValue(true);
    const store = require('@/lib/server/contactsStore');
    store.leaveGroup = mockLeave;
    mockGetContactsSession.mockResolvedValue({ isAuthenticated: true, userId: testUserId });

    const leaveReq = makeRequest({});
    // simulate URL with group id
    const res = await leaveRoute.POST(leaveReq, { url: 'http://localhost/api/contacts/groups/g1/leave' } as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
