
// jest tests for the contacts API route handlers.  Each test runs inside
// `jest.isolateModules` so that we get a fresh in-memory store for every
// assertion; this keeps contact state from bleeding between tests.

// stub out authentication helper so individual cases can control the return
// value without reaching into Next's cookies APIs.
jest.mock('@/lib/server/auth', () => ({
  getContactsSession: jest.fn(),
}));

// set env secrets used by invite logic
process.env.INVITE_SECRET = 'test-secret';
process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';

import type { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

describe('contacts API route', () => {
  function makeRequest(method: string, body?: any, origin?: string) {
    const init: RequestInit = {
      method,
      headers: {
        ...(origin ? { origin } : {}),
        'content-type': 'application/json',
      },
      body: body != null ? JSON.stringify(body) : null,
    };
    return new Request('http://localhost/api/contacts', init);
  }

  it('OPTIONS handler returns CORS headers', async () => {
    await jest.isolateModulesAsync(async () => {
      const { OPTIONS } = require('@/app/api/contacts/route');
      const req = makeRequest('OPTIONS', undefined, 'https://foo.example');
      const res: NextResponse = await OPTIONS(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://foo.example');
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(res.headers.get('Access-Control-Allow-Methods')).toMatch(/GET,POST,PATCH,DELETE,OPTIONS/);
    });
  });

  it('GET returns 401 when unauthenticated', async () => {
    await jest.isolateModulesAsync(async () => {
      const auth = require('@/lib/server/auth');
      (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
      const { GET } = require('@/app/api/contacts/route');

      const res: NextResponse = await GET(makeRequest('GET'));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  it('GET returns seeded contacts when authenticated', async () => {
    await jest.isolateModulesAsync(async () => {
      const auth = require('@/lib/server/auth');
      (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
      const { GET } = require('@/app/api/contacts/route');

      const res: NextResponse = await GET(makeRequest('GET', undefined, 'https://bar')); // include origin to exercise CORS
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://bar');

      const payload = await res.json();
      expect(Array.isArray(payload.contacts)).toBe(true);
      // seeded store has two contacts by default
      expect(payload.contacts.length).toBe(2);
    });
  });

  describe('POST /api/contacts', () => {
    it('returns 401 when unauthenticated', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
        const { POST } = require('@/app/api/contacts/route');

        const res: NextResponse = await POST(makeRequest('POST', { name: 'Foo' }));
        expect(res.status).toBe(401);
      });
    });

    it('validates name is present', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { POST } = require('@/app/api/contacts/route');

        const res: NextResponse = await POST(makeRequest('POST', { name: '   ' }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Name is required');
      });
    });

    it('creates a contact with minimal payload', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { POST, GET } = require('@/app/api/contacts/route');

        const newContact = { name: 'New Contact' };
        const res: NextResponse = await POST(makeRequest('POST', newContact));
        expect(res.status).toBe(201);
        const created = await res.json();
        expect(created.id).toBeDefined();
        expect(created.name).toBe('New Contact');

        // verify that it shows up in subsequent GET
        const list = await GET(makeRequest('GET')); // same user context from auth mock
        const payload = await list.json();
        expect(payload.contacts.some((c: any) => c.id === created.id)).toBe(true);
      });
    });

    it('creates with login and inviteToken', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { POST } = require('@/app/api/contacts/route');

        const payload = { name: 'Invitee', login: 'invite@example.com', inviteToken: 'token123' };
        const res = await POST(makeRequest('POST', payload));
        expect(res.status).toBe(201);
        const created = await res.json();
        expect(created.status).toBe('link_pending');
        expect(created.inviteToken).toBe('token123');
      });
    });
  });

  describe('PATCH /api/contacts', () => {
    it('requires authenticated session', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
        const { PATCH } = require('@/app/api/contacts/route');
        const res = await PATCH(makeRequest('PATCH', { id: 'c1', patch: { name: 'X' } }));
        expect(res.status).toBe(401);
      });
    });

    it('validates presence of id and patch', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { PATCH } = require('@/app/api/contacts/route');
        let res = await PATCH(makeRequest('PATCH', { patch: {} }));
        expect(res.status).toBe(400);
        res = await PATCH(makeRequest('PATCH', { id: 'c1' }));
        expect(res.status).toBe(400);
      });
    });

    it('returns 404 when contact not found', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { PATCH } = require('@/app/api/contacts/route');
        const res = await PATCH(makeRequest('PATCH', { id: 'does-not-exist', patch: { name: 'foo' } }));
        expect(res.status).toBe(404);
      });
    });

    it('updates an existing contact', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { PATCH } = require('@/app/api/contacts/route');
        const res = await PATCH(makeRequest('PATCH', { id: 'c1', patch: { name: 'Updated' } }));
        expect(res.status).toBe(200);
        const updated = await res.json();
        expect(updated.name).toBe('Updated');
      });
    });
  });

  describe('DELETE /api/contacts', () => {
    it('requires authentication', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
        const { DELETE } = require('@/app/api/contacts/route');
        const res = await DELETE(makeRequest('DELETE', { id: 'c1' }));
        expect(res.status).toBe(401);
      });
    });

    it('validates id', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { DELETE } = require('@/app/api/contacts/route');
        const res = await DELETE(makeRequest('DELETE', {}));
        expect(res.status).toBe(400);
      });
    });

    it('returns 404 when not found', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { DELETE } = require('@/app/api/contacts/route');
        const res = await DELETE(makeRequest('DELETE', { id: 'nope' }));
        expect(res.status).toBe(404);
      });
    });

    it('deletes an existing contact', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { DELETE, GET } = require('@/app/api/contacts/route');

        // ensure the contact exists first
        const listBefore = await GET(makeRequest('GET'));
        const payload = await listBefore.json();
        expect(payload.contacts.find((c: any) => c.id === 'c1')).toBeDefined();

        const res = await DELETE(makeRequest('DELETE', { id: 'c1' }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);

        const listAfter = await GET(makeRequest('GET'));
        const payloadAfter = await listAfter.json();
        const deletedContact = payloadAfter.contacts.find((c: any) => c.id === 'c1');
        expect(deletedContact).toBeUndefined();
      });
    });
  });

  describe('invite acceptance endpoint', () => {
    function makeAcceptRequest(token?: string) {
      const init: RequestInit = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: token ? JSON.stringify({ token }) : null,
      };
      return new Request('http://localhost/api/contacts/accept', init);
    }

    it('requires authentication', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
        const { POST } = require('@/app/api/contacts/accept/route');
        const res = await POST(makeAcceptRequest('whatever'));
        expect(res.status).toBe(401);
      });
    });

    it('validates token presence', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { POST } = require('@/app/api/contacts/accept/route');
        const res = await POST(makeAcceptRequest());
        expect(res.status).toBe(400);
      });
    });

    it('rejects accepting own invite link', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        // create a contact and invite as u1
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { POST: createContact } = require('@/app/api/contacts/route');
        const createRes = await createContact(makeRequest('POST', { name: 'Self' }));
        expect(createRes.status).toBe(201);
        const created = await createRes.json();

        const { POST: sendInvite } = require('@/app/api/contacts/invite/route');
        const inviteRes = await sendInvite(makeRequest('POST', { contactId: created.id }));
        expect(inviteRes.status).toBe(200);
        const { inviteToken } = await inviteRes.json();

        // accept using same user id – should be rejected with clear error
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { POST: acceptInvite } = require('@/app/api/contacts/accept/route');
        const acceptRes = await acceptInvite(makeAcceptRequest(inviteToken));
        expect(acceptRes.status).toBe(400);
        const body = await acceptRes.json();
        expect(body.error).toBe('self_invite');
        expect(body.message).toMatch(/cannot accept your own/i);

        // listing should still return the original contact in pending state
        const { GET: listContacts } = require('@/app/api/contacts/route');
        const listRes = await listContacts(makeRequest('GET'));
        expect(listRes.status).toBe(200);
        const listData = await listRes.json();
        expect(Array.isArray(listData.contacts)).toBe(true);
        // we don't assert the total count (seed data may add extras)
        const pending = listData.contacts.filter((c: any) => c.status === 'link_pending');
        expect(pending.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('returns 404 for unknown token', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { POST } = require('@/app/api/contacts/accept/route');
        const res = await POST(makeAcceptRequest('nope'));
        expect(res.status).toBe(404);
      });
    });

    it('links two users when valid token is posted', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        // first create a contact and then generate an invite token
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { POST: createContact, GET: listContacts1 } = require('@/app/api/contacts/route');
        const createRes = await createContact(makeRequest('POST', { name: 'Invited Person', login: 'invite@ex.com' }));
        expect(createRes.status).toBe(201);
        const created = await createRes.json();

        const { POST: sendInvite } = require('@/app/api/contacts/invite/route');
        const inviteRes = await sendInvite(makeRequest('POST', { contactId: created.id }));
        expect(inviteRes.status).toBe(200);
        const inviteBody = await inviteRes.json();
        const token = inviteBody.inviteToken;
        expect(typeof token).toBe('string');

        // now accept as user2
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u2', isAuthenticated: true });
        const { POST: acceptInvite } = require('@/app/api/contacts/accept/route');
        const acceptRes = await acceptInvite(makeAcceptRequest(token));
        expect(acceptRes.status).toBe(200);
        const accepted = await acceptRes.json();
        expect(accepted.status).toBe('linked');

        // list contacts for user2 should include the new contact
        const { GET: listContacts2 } = require('@/app/api/contacts/route');
        const list2 = await listContacts2(makeRequest('GET'));
        const p2 = await list2.json();
        expect(p2.contacts.some((c: any) => c.id === accepted.id)).toBe(true);

        // verify user1's original contact got updated to linked
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const list1 = await listContacts1(makeRequest('GET'));
        const p1 = await list1.json();
        const orig = p1.contacts.find((c: any) => c.inviteToken === null && c.login === 'invite@ex.com');
        expect(orig?.status).toBe('linked');
      });
    });

    it('deleting inviter contact unlinks the acceptor contact', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        // create a contact and invite as u1
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { POST: createContact, GET: listContacts1 } = require('@/app/api/contacts/route');
        const createRes = await createContact(makeRequest('POST', { name: 'Invited Person', login: 'invite@ex.com' }));
        expect(createRes.status).toBe(201);
        const created = await createRes.json();

        const { POST: sendInvite } = require('@/app/api/contacts/invite/route');
        const inviteRes = await sendInvite(makeRequest('POST', { contactId: created.id }));
        expect(inviteRes.status).toBe(200);
        const inviteBody = await inviteRes.json();
        const token = inviteBody.inviteToken;

        // accept as u2
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u2', isAuthenticated: true });
        const { POST: acceptInvite } = require('@/app/api/contacts/accept/route');
        const acceptRes = await acceptInvite(makeAcceptRequest(token));
        expect(acceptRes.status).toBe(200);
        const accepted = await acceptRes.json();
        expect(accepted.status).toBe('linked');

        // find the inviter's contact id as seen by u1
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const list1 = await listContacts1(makeRequest('GET'));
        const p1 = await list1.json();
        const orig = p1.contacts.find((c: any) => c.login === 'invite@ex.com');
        expect(orig).toBeDefined();
        // inviter contact should reference the acceptor as linkedUserId
        expect(orig.linkedUserId).toBe('u2');

        // delete inviter's contact (user1 deletes)
        const { DELETE } = require('@/app/api/contacts/route');
        const delRes = await DELETE(makeRequest('DELETE', { id: orig.id }));
        expect(delRes.status).toBe(200);

        // now check user2's contacts: the reciprocal contact should be present but not linked
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u2', isAuthenticated: true });
        const { GET: listContacts2 } = require('@/app/api/contacts/route');
        const list2 = await listContacts2(makeRequest('GET'));
        const p2 = await list2.json();
        // find the reciprocal contact created on accept by id and verify it was unlinked
        const recip = p2.contacts.find((c: any) => c.id === accepted.id);
        expect(recip).toBeDefined();
        expect(recip.status).toBe('not_linked');
      });
    });
  });

  describe('GET /api/contacts/invite/:token', () => {
    it('returns inviter/contact names when token is valid', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        // create a contact and invite
        const { POST: createContact } = require('@/app/api/contacts/route');
        const createRes = await createContact(makeRequest('POST', { name: 'Invitee', login: 'invite@example.com' }));
        const created = await createRes.json();
        const { POST: sendInvite } = require('@/app/api/contacts/invite/route');
        const inviteRes = await sendInvite(makeRequest('POST', { contactId: created.id }));
        const { inviteToken } = await inviteRes.json();

        const { GET: getInfo } = require('@/app/api/contacts/invite/[token]/route');
        const infoRes = await getInfo(makeRequest('GET'), { params: { token: inviteToken } });
        expect(infoRes.status).toBe(200);
        const infoBody = await infoRes.json();
        expect(infoBody.inviterName).toBe('u1');
        expect(infoBody.contactName).toBe('Invitee');
      });
    });

    it('marks selfInvite for the inviter even if contact name differs', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        // create a contact with a different display name than the user id
        const { POST: createContact } = require('@/app/api/contacts/route');
        const createRes = await createContact(makeRequest('POST', { name: 'Mia' }));
        const created = await createRes.json();
        const { POST: sendInvite } = require('@/app/api/contacts/invite/route');
        const inviteRes = await sendInvite(makeRequest('POST', { contactId: created.id }));
        const { inviteToken } = await inviteRes.json();

        const { GET: getInfo } = require('@/app/api/contacts/invite/[token]/route');
        const infoRes = await getInfo(makeRequest('GET'), { params: { token: inviteToken } });
        expect(infoRes.status).toBe(200);
        const infoBody = await infoRes.json();
        expect(infoBody.selfInvite).toBe(true);
      });
    });

    it('returns 404 with not_found message when token is unknown', async () => {
      await jest.isolateModulesAsync(async () => {
        const { GET: getInfo } = require('@/app/api/contacts/invite/[token]/route');
        const res = await getInfo(makeRequest('GET'), { params: { token: 'nope' } });
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe('not_found');
      });
    });

    it('returns 410 with expired message when token has expired', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { POST: createContact } = require('@/app/api/contacts/route');
        const createRes = await createContact(makeRequest('POST', { name: 'X' }));
        const created = await createRes.json();
        // manually create an expired JWT and store it on the contact
        const store = require('@/lib/server/contactsStore');
        const expiredToken = jwt.sign({ inviter: 'u1', contactId: created.id }, 'test-secret', { expiresIn: '-1s' });
        await store.updateContact('u1', created.id, { inviteToken: expiredToken });

        const { GET: getInfo } = require('@/app/api/contacts/invite/[token]/route');
        const res = await getInfo(makeRequest('GET'), { params: { token: expiredToken } });
        expect(res.status).toBe(410);
        const body = await res.json();
        expect(body.error).toBe('expired');
      });
    });
  });

  describe('POST /api/contacts/invite', () => {
    it('generates a signed JWT and returns a link', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });

        const { POST: createContact } = require('@/app/api/contacts/route');
        const createRes = await createContact(makeRequest('POST', { name: 'ToInvite' }));
        const created = await createRes.json();
        expect(createRes.status).toBe(201);

        const { POST: invite } = require('@/app/api/contacts/invite/route');
        const inviteRes = await invite(makeRequest('POST', { contactId: created.id }));
        expect(inviteRes.status).toBe(200);
        const body = await inviteRes.json();
        expect(typeof body.inviteToken).toBe('string');
        // verify JWT can be decoded with our secret
        const payload = jwt.verify(body.inviteToken, 'test-secret') as any;
        expect(payload).toHaveProperty('inviter', 'u1');
        expect(payload).toHaveProperty('contactId', created.id);
        // link should include base url and token
        expect(body.inviteLink).toBe(`https://example.com/accept-invite?token=${encodeURIComponent(body.inviteToken)}`);
      });
    });
  });

  describe('contact groups API', () => {
    function makeGroupRequest(method: string, body?: any) {
      const init: RequestInit = {
        method,
        headers: { 'content-type': 'application/json' },
        body: body != null ? JSON.stringify(body) : (null as any),
      };
      return new Request('http://localhost/api/contacts/groups', init);
    }

    it('requires authentication for groups', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
        const { GET } = require('@/app/api/contacts/groups/route');
        const res = await GET(makeGroupRequest('GET'));
        expect(res.status).toBe(401);
      });
    });

    it('allows unauthed users to reject invites', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        // simulate not logged in
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
        // create a contact and invite as before
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { POST: createContact } = require('@/app/api/contacts/route');
        const createRes = await createContact(makeRequest('POST', { name: 'Invitee' }));
        const created = await createRes.json();
        const { POST: sendInvite } = require('@/app/api/contacts/invite/route');
        const inviteRes = await sendInvite(makeRequest('POST', { contactId: created.id }));
        const { inviteToken } = await inviteRes.json();

        // now reject while unauthenticated
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: '', isAuthenticated: false });
        const { DELETE: rejectInviteRoute } = require('@/app/api/contacts/invite/[token]/route');
        const rej = await rejectInviteRoute(makeRequest('DELETE'), { params: { token: inviteToken } });
        expect(rej.status).toBe(200);

        // subsequent GET should 404
        const { GET: getInfo } = require('@/app/api/contacts/invite/[token]/route');
        const infoRes = await getInfo(makeRequest('GET'), { params: { token: inviteToken } });
        expect(infoRes.status).toBe(404);
      });
    });

    it('can create, rename, list, and delete a group', async () => {
      await jest.isolateModulesAsync(async () => {
        const auth = require('@/lib/server/auth');
        (auth.getContactsSession as jest.Mock).mockResolvedValue({ userId: 'u1', isAuthenticated: true });
        const { GET, POST, PATCH, DELETE } = require('@/app/api/contacts/groups/route');

        // initially empty
        let res = await GET(makeGroupRequest('GET'));
        expect(res.status).toBe(200);
        let data = await res.json();
        expect(Array.isArray(data.groups)).toBe(true);
        expect(data.groups.length).toBe(0);

        // create group
        res = await POST(makeGroupRequest('POST', { name: 'Friends' }));
        expect(res.status).toBe(201);
        const created = await res.json();
        expect(created.name).toBe('Friends');
        const groupId = created.id;

        // rename group
        res = await PATCH(makeGroupRequest('PATCH', { id: groupId, patch: { name: 'Besties' } }));
        expect(res.status).toBe(200);
        const updated = await res.json();
        expect(updated.name).toBe('Besties');

        // list again
        res = await GET(makeGroupRequest('GET'));
        data = await res.json();
        expect(data.groups.length).toBe(1);

        // delete
        res = await DELETE(makeGroupRequest('DELETE', { id: groupId }));
        expect(res.status).toBe(200);
        const delBody = await res.json();
        expect(delBody.ok).toBe(true);

        res = await GET(makeGroupRequest('GET'));
        data = await res.json();
        expect(data.groups.length).toBe(0);
      });
    });
  });
});
