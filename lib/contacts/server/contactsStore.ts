import 'server-only';

import type {
  Contact,
  InviteToken,
  ContactGroup,
  ContactGroupInput,
  Connection,
  ConnectionStatus,
  InvitationLink,
  InviterProfile,
  PendingRequest
} from '@myorg/types';

import jwt from 'jsonwebtoken';
import { createStorageProvider, getSupabaseAdminClient } from '@myorg/storage';
import { generateId } from '@myorg/utils';
import type { PersistedUserData } from '@myorg/storage';

const storage = createStorageProvider();

export async function addTrace(action: string, meta: any = {}) {
  try {
    const key = 'sys_trace_logs';
    let existing;
    try {
      existing = (await storage.load(key)) || { tasks: [], projects: [], people: [], groups: [] };
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        existing = { tasks: [], projects: [], people: [], groups: [] };
      } else {
        throw e;
      }
    }
    const logs = (existing as any).logs || [];
    logs.push({ t: new Date().toISOString(), action, meta });
    // keep last 1000
    if (logs.length > 1000) logs.splice(0, logs.length - 1000);
    const data = { ...existing, logs } as any;
    await storage.save(key, data);
    console.log('[FOMO_TRACE]', action, JSON.stringify(meta));
  } catch (err) {
    console.error('Failed to write trace', err);
  }
}


// Broadcast an event to a user's client using Supabase Realtime
async function broadcastToUser(targetUserId: string, eventName: string) {
  try {
    await addTrace('broadcastToUser_start', { targetUserId, eventName });
    const supabase = getSupabaseAdminClient();
    if (!supabase) return;
    const channel = supabase.channel(`user-${targetUserId}`);
    let resolved = false;

    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, 1500);

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: eventName,
            payload: { ts: Date.now() }
          });
          await addTrace('broadcastToUser_sent', { targetUserId, eventName });
          await supabase.removeChannel(channel);
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(true);
          }
        }
      });
    });
  } catch (err) {
    console.error('Failed to broadcast to user:', targetUserId, err);
  }
}



const globalForStore = global as unknown as {
  _contactsStoreCache?: {
    contactsByUser: Map<string, Contact[]>;
    groupsByUser: Map<string, ContactGroup[]>;
    groupInviteByToken: Map<string, { ownerUserId: string; groupId: string; contactId: string }>;
    invitationLinks: Map<string, InvitationLink>;
    connections: Map<string, Connection>;
    pendingRequests: Map<string, { id: string; inviterId: string; invitedId: string; requestedAt: string }>;
  }
};

const cache = globalForStore._contactsStoreCache || {
  contactsByUser: new Map<string, Contact[]>(),
  groupsByUser: new Map<string, ContactGroup[]>(),
  groupInviteByToken: new Map<string, { ownerUserId: string; groupId: string; contactId: string }>(),
  invitationLinks: new Map<string, InvitationLink>(),
  connections: new Map<string, Connection>(),
  pendingRequests: new Map<string, { id: string; inviterId: string; invitedId: string; requestedAt: string }>(),
};

if (process.env.NODE_ENV !== 'production') {
  globalForStore._contactsStoreCache = cache;
}

const contactsByUser = cache.contactsByUser;
const groupsByUser = cache.groupsByUser;
const groupInviteByToken = cache.groupInviteByToken;

// New data structures for two-phase handshake
const invitationLinks = cache.invitationLinks;
const connections = cache.connections;
const pendingRequests = cache.pendingRequests;

const SYSTEM_ID = 'system_contacts';
let systemLoaded = false;

async function loadSystemData() {
  
  try {
    const persisted = await storage.load(SYSTEM_ID).catch(() => null);
    // clear and update synchronously after async fetch
    invitationLinks.clear();
    connections.clear();
    pendingRequests.clear();

    // clear and update synchronously after async fetch
    invitationLinks.clear();
    connections.clear();
    pendingRequests.clear();

    if (persisted) {
      if (Array.isArray(persisted.invitationLinks)) {
        persisted.invitationLinks.forEach((link: any) => invitationLinks.set(link.token, link));
      }
      if (Array.isArray(persisted.connections)) {
        persisted.connections.forEach((conn: any) => connections.set(conn.id, conn));
      }
      if (Array.isArray(persisted.pendingRequests)) {
        persisted.pendingRequests.forEach((req: any) => pendingRequests.set(req.id, req));
      }
    }
  } catch (err) {
    console.error('contactsStore: failed to load system data', err);
  }
  
}

async function saveSystemData() {
  try {
    await addTrace('saveSystemData_start', { 
      invitationLinks: invitationLinks.size,
      connections: connections.size,
      pendingRequests: pendingRequests.size
    });
    const data: PersistedUserData = {
      invitationLinks: Array.from(invitationLinks.values()),
      connections: Array.from(connections.values()),
      pendingRequests: Array.from(pendingRequests.values())
    };
    await storage.save(SYSTEM_ID, data);
    console.log('contactsStore: persisted system data');
  } catch (err) {
    console.error('contactsStore: failed to persist system data', err);
  }
}

// secret used to sign invite JWTs; tests set process.env.INVITE_SECRET
const INVITE_SECRET = process.env.INVITE_SECRET || 'default-invite-secret';

// Runtime type guards for persisted data (storage.load returns unknown)
function isContact(obj: unknown): obj is Contact {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).status === 'string' &&
    ('inviteToken' in (obj as any) ? (typeof (obj as any).inviteToken === 'string' || (obj as any).inviteToken === null) : true)
  );
}

function isContactArray(v: unknown): v is Contact[] {
  return Array.isArray(v) && v.every(isContact);
}

function isContactGroup(obj: unknown): obj is ContactGroup {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).name === 'string' &&
    Array.isArray((obj as any).contactIds)
  );
}

function isContactGroupArray(v: unknown): v is ContactGroup[] {
  return Array.isArray(v) && v.every(isContactGroup);
}



async function savePersisted(userId: string): Promise<void> {
  try {
    const existing = (await storage.load(userId)) || { tasks: [], projects: [], people: [], groups: [] };
    const data: PersistedUserData = {
      ...existing,
      people: contactsByUser.get(userId) ?? existing.people ?? [],
      groups: groupsByUser.get(userId) ?? existing.groups ?? []
    };
    await storage.save(userId, data);
    await addTrace('savePersisted', { userId, peopleCount: Array.isArray(data.people) ? data.people.length : 0, groupsCount: Array.isArray(data.groups) ? data.groups.length : 0 });
    console.log('contactsStore: persisted data');
  } catch (err) {
    console.error('contactsStore: failed to persist', err);
  }
}

async function getOrInitUserContacts(userId: string): Promise<Contact[]> {
  await addTrace('getOrInitUserContacts', { userId });
  // Always fetch from DB in serverless

  const persisted = await storage.load(userId).catch(() => null);
  if (persisted && isContactArray(persisted.people)) {
    contactsByUser.set(userId, persisted.people);
    return persisted.people;
  }

  // No persisted data found — start with an empty list (no seed data).
  // For tests we provide a small seeded dataset for a common test user
  // so API unit tests can rely on stable ids like 'c1'/'c2'. In non-test
  // environments start with an empty list.
  if (process.env.NODE_ENV === 'test' && userId === 'u1') {
    const seeded: Contact[] = [
      { id: 'c1', name: 'Test Contact 1', login: '', status: 'not_linked', inviteToken: null },
      { id: 'c2', name: 'Test Contact 2', login: '', status: 'not_linked', inviteToken: null },
    ];
    contactsByUser.set(userId, seeded);
    return seeded;
  }
  contactsByUser.set(userId, []);
  return [];
}

async function getOrInitUserGroups(userId: string): Promise<ContactGroup[]> {
  // Always fetch from DB in serverless

  const persisted = await storage.load(userId).catch(() => null);
  if (persisted && isContactGroupArray(persisted.groups)) {
    groupsByUser.set(userId, persisted.groups);
    return persisted.groups;
  }

  groupsByUser.set(userId, []);
  return [];
}

// Generates and assigns an invite token to a contact, returns the token string
export async function inviteContact(userId: string, contactId: string): Promise<string | null> {
  const current = await getOrInitUserContacts(userId);
  const idx = current.findIndex((c) => c.id === contactId);
  if (idx === -1) return null;
  const existing = current[idx];
  if (!existing) return null;
  // Create a signed JWT containing inviter and contact id.  Because the
  // token is stored in the contact row we can also look it up later if
  // needed, but the JWT itself is authoritative (and expires automatically).
  // Include inviter's info for reciprocal contact creation
  const payload = { 
    inviter: userId, 
    contactId,
    inviterName: existing.name,
    inviterLogin: existing.login || null
  };
  const token = jwt.sign(payload, INVITE_SECRET, { expiresIn: '30d' });
  current[idx] = {
    id: existing.id,
    name: existing.name,
    ...(existing.login ? { login: existing.login } : {}),
    status: 'link_pending',
    inviteToken: token,
  };
  contactsByUser.set(userId, current);
  await savePersisted(userId);
  return token;
}

export async function listContacts(userId: string): Promise<Contact[]> {
  const allContacts = await getOrInitUserContacts(userId);
  return allContacts;
}

export async function createContact(
  userId: string,
  input: Pick<Contact, 'name'> & Partial<Omit<Contact, 'id' | 'name'>>,
): Promise<Contact> {
  await addTrace('createContact', { userId, input });
  const current = await getOrInitUserContacts(userId);
  
  // Check for duplicate names (case-insensitive)
  const existingContact = current.find(contact => 
    contact.name.toLowerCase() === input.name.toLowerCase()
  );
  if (existingContact) {
    throw new Error('A contact with this name already exists');
  }
  
  const contact: Contact = {
    id: generateId(),
    name: input.name,
    login: input.login ?? '',
    status: input.status ?? 'not_linked',
    inviteToken: input.inviteToken ?? null,
    ...(input.linkedUserId ? { linkedUserId: input.linkedUserId } : {}),
    ...(input.oauthProvider ? { oauthProvider: input.oauthProvider } : {}),
    ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
    ...(input.realName ? { realName: input.realName } : {}),
    ...(input.realEmail ? { realEmail: input.realEmail } : {}),
  };
  current.push(contact);
  contactsByUser.set(userId, current);
  await savePersisted(userId);
  return contact;
}

export async function updateContact(
  userId: string,
  id: string,
  patch: Partial<Omit<Contact, 'id'>>,
): Promise<Contact | null> {
  await addTrace('updateContact', { userId, id, patch });
  const current = await getOrInitUserContacts(userId);
  
  // If updating name, check for duplicates
  if (patch.name) {
    const existingContact = current.find(contact => 
      contact.id !== id && contact.name.toLowerCase() === patch.name!.toLowerCase()
    );
    if (existingContact) {
      throw new Error('A contact with this name already exists');
    }
  }
  
  const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
  const updated = next.find((item) => item.id === id) ?? null;
  contactsByUser.set(userId, next);
  await savePersisted(userId);
  return updated;
}

export async function unlinkContact(userId: string, contactId: string): Promise<boolean> {
  await loadSystemData();
  const current = await getOrInitUserContacts(userId);
  const contactIndex = current.findIndex((item) => item.id === contactId);
  if (contactIndex === -1) return false;

  const contact = current[contactIndex]!;
  
  // Change this contact's status to 'not_linked'
  contact.status = 'not_linked';
  contact.inviteToken = null;
  const linkedId = contact.linkedUserId;
  delete contact.linkedUserId;
  contactsByUser.set(userId, current);

  // If this contact represents a linked user, also unlink the reciprocal contact
  if (linkedId) {
    const reciprocalContacts = await getOrInitUserContacts(linkedId);
    // update all reciprocal contacts that point back to this user
    const updatedRecips = reciprocalContacts.map((c) =>
      c.linkedUserId === userId ? { ...c, status: 'not_linked' as const, inviteToken: null, linkedUserId: undefined } : c
    );
    contactsByUser.set(linkedId, updatedRecips as Contact[]);

    // remove the connection as well
    const connectionToRemove = Array.from(connections.values()).find(
      conn => (conn.inviterId === userId && conn.invitedId === linkedId) ||
               (conn.inviterId === linkedId && conn.invitedId === userId)
    );
    if (connectionToRemove) {
      connections.delete(connectionToRemove.id);
    }
  }

  await savePersisted(userId);
  if (linkedId) {
    await savePersisted(linkedId);
  }
  await saveSystemData();
  return true;
}

export async function deleteContact(userId: string, contactId: string): Promise<boolean> {
  await addTrace('deleteContact_start', { userId, contactId });
  await loadSystemData();
  try {
    const current = await getOrInitUserContacts(userId);
    const contactIndex = current.findIndex((item) => item.id === contactId);
    if (contactIndex === -1) {
      await addTrace('deleteContact_not_found', { userId, contactId });
      return false;
    }

    const contact = current[contactIndex]!;

    // Remove the contact from this user's list
    const next = current.filter((item) => item.id !== contactId);
    contactsByUser.set(userId, next);

    // Bilateral deletion: also remove the reciprocal contact
    if (contact.linkedUserId) {
      const reciprocalContacts = await getOrInitUserContacts(contact.linkedUserId);
      const updatedRecips = reciprocalContacts.filter((c) => c.linkedUserId !== userId);
      contactsByUser.set(contact.linkedUserId, updatedRecips);

      // Also remove the connection
      const connectionToRemove = Array.from(connections.values()).find(
        conn => (conn.inviterId === userId && conn.invitedId === contact.linkedUserId) ||
                 (conn.inviterId === contact.linkedUserId && conn.invitedId === userId)
      );
      if (connectionToRemove) {
        connections.delete(connectionToRemove.id);
      }
    }

    const tasks: Promise<void>[] = [];
    tasks.push(savePersisted(userId));
    tasks.push(broadcastToUser(userId, 'contacts-updated'));

    if (contact.linkedUserId) {
      tasks.push(savePersisted(contact.linkedUserId));
      tasks.push(broadcastToUser(contact.linkedUserId, 'contacts-updated'));
    }

    await Promise.all(tasks);
    await saveSystemData();
    await addTrace('deleteContact_success', { userId, contactId });
    return true;
  } catch (err: any) {
    await addTrace('deleteContact_error', { userId, contactId, error: err.message });
    throw err;
  }
}

// invite acceptance helpers
export async function findContactByInviteToken(token: InviteToken): Promise<{ userId: string; contact: Contact } | null> {
  // decode the JWT to determine the inviter and contact id, then lookup
  // directly.  this is more reliable than scanning all contacts by token
  // and avoids races when the in-memory map isn't shared across handler
  // invocations.
  let decoded: any;
  try {
    decoded = jwt.decode(token) as { inviter: string; contactId: string } | null;
  } catch {
    return null;
  }
  if (!decoded) return null;
  const contacts = await getOrInitUserContacts(decoded.inviter);
  const contact = contacts.find((c) => c.id === decoded.contactId);
  if (contact && contact.inviteToken === token) {
    return { userId: decoded.inviter, contact };
  }
  return null;
}

// additional helpers used by the invite API route
export async function findInviteByToken(token: InviteToken): Promise<{
  ownerId: string;
  contactName: string;
  inviterId: string;
} | null> {
  console.log('[store] findInviteByToken called with', token);
  let decoded: any;
  try {
    // do not verify here; caller handles expiration/invalid errors so we
    // can still return data for an expired token (needed for 410 response)
    decoded = jwt.decode(token) as { inviter: string; contactId: string } | null;
    console.log('[store] decoded', decoded);
  } catch (err) {
    console.log('[store] jwt.decode failed', err);
    return null;
  }
  if (!decoded) {
    return null;
  }
  const contacts = await getOrInitUserContacts(decoded.inviter);
  console.log('[store] contacts list', contacts.map(c => ({ id: c.id, inviteToken: c.inviteToken })));
  const contact = contacts.find((c) => c.id === decoded.contactId);
  if (!contact) {
    console.log('[store] contact not found for id', decoded.contactId);
    return null;
  }
  if (contact.inviteToken !== token) {
    console.log('[store] token mismatch', contact.inviteToken);
    return null;
  }
  return {
    ownerId: decoded.inviter,
    contactName: contact.name,
    // inviterId should always be the user who generated the invite (the
    // decoded.inviter value).  previous logic confused this with the
    // contact's name or login when those fields were present, which meant
    // self-invite detection could fail when the invitee name differed from
    // the inviter's user ID.  see issue reproduced in tests below.
    inviterId: decoded.inviter,
  };
}

export async function invalidateInviteToken(token: InviteToken): Promise<void> {
  const match = await findContactByInviteToken(token);
  if (!match) return;
  await updateContact(match.userId, match.contact.id, { inviteToken: null, status: 'not_linked' });
}

export async function findUserById(userId: string): Promise<{ id: string; name?: string; email?: string; avatarUrl?: string; provider?: string }> {
  try {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (data?.user) {
        const metadata = data.user.user_metadata || {};
        const identities = data.user.identities || [];
        const provider = identities[0]?.provider || 'email';
        
        return {
          id: userId,
          name: (metadata.full_name || metadata.name || (data.user.email ? data.user.email.split('@')[0] : userId)) as string,
          email: data.user.email || '',
          avatarUrl: (metadata.avatar_url || metadata.picture || '') as string,
          provider
        };
      }
    }
  } catch (err) {
    console.warn('[ContactsStore] Failed to fetch user from Supabase admin:', err);
  }

  // fallback if not using Supabase or not found
  return { id: userId, name: userId, email: userId };
}

export class SelfInvitationError extends Error {
  constructor(message = 'cannot accept your own invitation') {
    super(message);
    this.name = 'SelfInvitationError';
  }
}

export async function acceptInvite(userId: string, token: InviteToken): Promise<Contact | null> {
  // first verify the JWT; if invalid/expired we'll treat it as not-found
  let decoded: any;
  try {
    decoded = jwt.verify(token, INVITE_SECRET) as { inviter: string; contactId: string };
  } catch {
    return null;
  }

  // optionally ensure we still have a matching contact row and that the
  // stored token matches the provided one (prevents reuse if we regenerated)
  const match = await findContactByInviteToken(token);
  if (!match) return null;

  // reject self-accepts; the inviter already has the contact and following a
  // link yourself is misuse of the feature.
  if (userId === match.userId) {
    throw new SelfInvitationError();
  }

  // mark inviter side as linked, clear token, and record reciprocal linked user id
  // so that deletes/unlinks on either side can find the reciprocal contact.
  await updateContact(match.userId, match.contact.id, { status: 'linked', inviteToken: null, linkedUserId: userId });

  // check if acceptor already has a contact for the inviter
  const acceptorContacts = await getOrInitUserContacts(userId);
  const inviter = await findUserById(decoded.inviter);
  const existingContact = acceptorContacts.find(contact => 
    contact.name.toLowerCase() === inviter.name?.toLowerCase() ||
    (contact.login && contact.login.toLowerCase() === inviter.email?.toLowerCase()) ||
    contact.linkedUserId === decoded.inviter
  );

  let reciprocalContact: Contact;
  if (existingContact) {
    // update existing contact to linked
    reciprocalContact = await updateContact(userId, existingContact.id, { 
      status: 'linked', 
      linkedUserId: decoded.inviter 
    }) as Contact;
  } else {
    // create reciprocal contact for acceptor using inviter's information
    const inviter = await findUserById(decoded.inviter);
    reciprocalContact = await createContact(userId, {
      name: inviter.name || inviter.email || decoded.inviter,
      status: 'linked',
      linkedUserId: decoded.inviter,
    });
  }

  return reciprocalContact;
}

// group helpers
export async function listGroups(userId: string): Promise<ContactGroup[]> {
  return [...(await getOrInitUserGroups(userId))];
}

export async function createGroup(userId: string, input: ContactGroupInput): Promise<ContactGroup> {
  const current = await getOrInitUserGroups(userId);
  const group: ContactGroup = {
    id: generateId(),
    name: input.name,
    contactIds: 'contactIds' in input && Array.isArray((input as ContactGroupInput & { contactIds?: string[] }).contactIds)
      ? ((input as ContactGroupInput & { contactIds?: string[] }).contactIds ?? [])
      : [],
  };
  current.push(group);
  groupsByUser.set(userId, current);
  await savePersisted(userId);
  return group;
}

export async function inviteToGroup(userId: string, groupId: string, contactId: string): Promise<string | null> {
  const current = await getOrInitUserGroups(userId);
  const group = current.find((item) => item.id === groupId);
  if (!group) return null;

  const token = `grp_${groupId}_${Math.random().toString(36).slice(2, 10)}`;
  groupInviteByToken.set(token, { ownerUserId: userId, groupId, contactId });
  return token;
}

export async function acceptGroupInvite(userId: string, token: string): Promise<ContactGroup | null> {
  const invite = groupInviteByToken.get(token);
  if (!invite) return null;
  const ownerGroups = await getOrInitUserGroups(invite.ownerUserId);
  const group = ownerGroups.find((item) => item.id === invite.groupId);
  if (!group) return null;

  const userContacts = await getOrInitUserContacts(userId);
  const contactExists = userContacts.some((item: Contact) => item.id === invite.contactId);
  if (!contactExists) {
    groupInviteByToken.delete(token);
    return null;
  }

  if (!group.contactIds.includes(invite.contactId)) {
    group.contactIds = [...group.contactIds, invite.contactId];
    groupsByUser.set(invite.ownerUserId, ownerGroups);
    await savePersisted(invite.ownerUserId);
  }

  groupInviteByToken.delete(token);
  return group;
}

export async function updateGroup(userId: string, id: string, patch: Partial<ContactGroupInput>): Promise<ContactGroup | null> {
  const current = await getOrInitUserGroups(userId);
  const next = current.map((g) => (g.id === id ? { ...g, ...(patch.name ? { name: patch.name } : {}), ...(patch.contactIds ? { contactIds: patch.contactIds } : {}) } : g));
  const updated = next.find((g) => g.id === id) ?? null;
  groupsByUser.set(userId, next);
  await savePersisted(userId);
  return updated;
}

export async function deleteGroup(userId: string, id: string): Promise<boolean> {
  const current = await getOrInitUserGroups(userId);
  const next = current.filter((g) => g.id !== id);
  groupsByUser.set(userId, next);
  await savePersisted(userId);
  return next.length !== current.length;
}

// New functions for two-phase handshake system

export async function generateInviteLink(userId: string): Promise<{ token: string; expiresAt: string }> {
  await loadSystemData();
  
  // Revoke any existing active links for this user
  for (const [existingToken, link] of Array.from(invitationLinks.entries())) {
    if (link.creatorId === userId) {
      invitationLinks.delete(existingToken);
    }
  }

  const token = jwt.sign({ userId, jti: generateId() }, INVITE_SECRET, { expiresIn: '7d' });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const invitationLink: InvitationLink = {
    id: generateId(),
    creatorId: userId,
    token,
    expiresAt,
    isUsed: false,
  };

  invitationLinks.set(token, invitationLink);
  await saveSystemData();
  return { token, expiresAt };
}

export async function getActiveInviteLink(userId: string): Promise<InvitationLink | null> {
  await loadSystemData();
  const now = new Date();
  for (const link of Array.from(invitationLinks.values())) {
    if (link.creatorId === userId && new Date(link.expiresAt) > now) {
      return link;
    }
  }
  return null;
}

export async function deleteActiveInviteLink(userId: string): Promise<void> {
  await loadSystemData();
  let deleted = false;
  for (const [existingToken, link] of Array.from(invitationLinks.entries())) {
    if (link.creatorId === userId) {
      invitationLinks.delete(existingToken);
      deleted = true;
    }
  }
  if (deleted) {
    await saveSystemData();
  }
}

export async function getInviteDetails(token: string): Promise<InviterProfile | null> {
  await loadSystemData();
  try {
    const decoded = jwt.verify(token, INVITE_SECRET) as { userId: string };
    const user = await findUserById(decoded.userId);

    // Check if invitation link exists and is not expired
    const invitation = invitationLinks.get(token);
    if (!invitation || new Date(invitation.expiresAt) < new Date()) {
        await addTrace('getInviteDetails_error', { reason: 'not_found_or_expired', tokenExists: !!invitation });
        throw new Error('Invitation expired');
      }

      const oauthProvider = user.provider || 'system';
      const avatarUrl = user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || '')}&background=random`;

      return {
        fullName: user.name || user.email || '',
        email: user.email || '',
        oauthProvider,
        avatarUrl,
      };
    } catch (error: any) {
      await addTrace('getInviteDetails_catch', { message: error.message, name: error.name });
    return null;
  }
}

export async function requestLinkage(userId: string, token: string): Promise<{ requestId: string }> {
  await addTrace('requestLinkage_start', { userId, token });
  await loadSystemData();
  try {
    const inviterProfile = await getInviteDetails(token);
    if (!inviterProfile) {
      await addTrace('requestLinkage_error', { reason: 'getInviteDetails returned null' });
      throw new Error('Invalid or expired invitation');
    }

    // Decode token to get inviter ID
    const decoded = jwt.verify(token, INVITE_SECRET) as { userId: string };
    const inviterId = decoded.userId;

    if (inviterId === userId) {
      throw new SelfInvitationError('You cannot accept your own connection invite. If testing locally, please copy the link and open it in a private/incognito window to act as the second user.');
    }

    // Check if connection already exists
    const existingConnection = Array.from(connections.values()).find(
      conn => (conn.inviterId === inviterId && conn.invitedId === userId) ||
               (conn.inviterId === userId && conn.invitedId === inviterId)
    );

    if (existingConnection) {
      // Auto-cleanup for previous data corruption (if a user deleted their 
      // contact but the connection persisted, or if re-inviting an active connection).
      connections.delete(existingConnection.id);
      await addTrace('requestLinkage_cleanup_stale', { connectionId: existingConnection.id });
    }

    // Also clean up any old pending requests between these two users
    for (const [reqId, req] of Array.from(pendingRequests.entries())) {
      if ((req.inviterId === inviterId && req.invitedId === userId) || 
          (req.inviterId === userId && req.invitedId === inviterId)) {
        pendingRequests.delete(reqId);
      }
    }

    // Create pending request
    const requestId = generateId();
    const requestedAt = new Date().toISOString();

    pendingRequests.set(requestId, {
      id: requestId,
      inviterId,
      invitedId: userId,
      requestedAt,
    });

    await saveSystemData();
    await broadcastToUser(inviterId, 'contacts-updated');
    await addTrace('requestLinkage_success', { inviterId, requestId });
    return { requestId };
  } catch (err: any) {
    await addTrace('requestLinkage_error', { reason: err.message, stack: err.stack });
    throw err;
  }
}

export async function getPendingRequests(userId: string): Promise<PendingRequest[]> {
  await loadSystemData();
  const userRequests = Array.from(pendingRequests.values())
    .filter(req => req.inviterId === userId)
    .map(async (req) => {
      const inviteeProfile = await getInviteDetailsForUser(req.invitedId);
      return {
        id: req.id,
        requesterProfile: inviteeProfile,
        requestedAt: req.requestedAt,
      };
    });

  return Promise.all(userRequests);
}

async function getInviteDetailsForUser(userId: string): Promise<InviterProfile> {
  const user = await findUserById(userId);
  const oauthProvider = user.provider || 'system';
  const avatarUrl = user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || '')}&background=random`;

  return {
    fullName: user.name || user.email || '',
    email: user.email || '',
    oauthProvider,
    avatarUrl,
  };
}

export async function approveRequest(userId: string, requestId: string): Promise<void> {
  await addTrace('approveRequest_start', { userId, requestId });
  await loadSystemData();
  const request = pendingRequests.get(requestId);
  if (!request || request.inviterId !== userId) {
    throw new Error('Request not found or unauthorized');
  }

  // Create connection
  const connectionId = generateId();
  const now = new Date().toISOString();

  const connection: Connection = {
    id: connectionId,
    inviterId: request.inviterId,
    invitedId: request.invitedId,
    status: 'CONNECTED',
    createdAt: now,
    updatedAt: now,
  };

  connections.set(connectionId, connection);

  // Create contacts for both users concurrently
  await Promise.all([
    createContactForConnection(request.inviterId, request.invitedId),
    createContactForConnection(request.invitedId, request.inviterId)
  ]);

  // Remove pending request
  pendingRequests.delete(requestId);
  await saveSystemData();
  
  // Broadcast to both users concurrently
  await Promise.all([
    broadcastToUser(request.inviterId, 'contacts-updated'),
    broadcastToUser(request.invitedId, 'contacts-updated')
  ]);
}

export async function rejectRequest(userId: string, requestId: string): Promise<void> {
  // we could broadcast, but for now we'll do it inside
  await loadSystemData();
  const request = pendingRequests.get(requestId);
  if (!request || request.inviterId !== userId) {
    throw new Error('Request not found or unauthorized');
  }

  // Remove pending request
  pendingRequests.delete(requestId);
  await saveSystemData();
  
  // Broadcast to both users concurrently
  await Promise.all([
    broadcastToUser(request.inviterId, 'contacts-updated'),
    broadcastToUser(request.invitedId, 'contacts-updated')
  ]);
}

async function createContactForConnection(userId: string, connectedUserId: string): Promise<void> {
  await addTrace('createContactForConnection_start', { userId, connectedUserId });
  const user = await findUserById(connectedUserId);
  const existingContacts = await getOrInitUserContacts(userId);

  // Check if contact already exists by linkedUserId
  let existingContact = existingContacts.find(
    contact => contact.linkedUserId === connectedUserId
  );

  const desiredName = user.name || user.email || connectedUserId;

  if (!existingContact) {
    // Fallback: check if they have a manual contact with exactly this name
    existingContact = existingContacts.find(
      contact => contact.name.toLowerCase() === desiredName.toLowerCase()
    );
  }

  if (!existingContact) {
    await addTrace('createContactForConnection_new', { userId, desiredName, connectedUserId });
    // We are safe to create a new one
    await createContact(userId, {
      name: desiredName,
      status: 'linked',
      linkedUserId: connectedUserId,
      ...(user.name ? { realName: user.name } : {}),
      ...(user.email ? { realEmail: user.email } : {}),
      ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
      ...(user.provider ? { oauthProvider: user.provider } : {})
    });
  } else if (
    existingContact.status !== 'linked' || 
    existingContact.linkedUserId !== connectedUserId ||
    (user.name && existingContact.realName !== user.name) ||
    (user.email && existingContact.realEmail !== user.email) ||
    (user.avatarUrl && existingContact.avatarUrl !== user.avatarUrl) ||
    (user.provider && existingContact.oauthProvider !== user.provider)
  ) {
    await addTrace('createContactForConnection_update', { userId, existingContactId: existingContact.id, connectedUserId });
    await updateContact(userId, existingContact.id, {
      status: 'linked',
      linkedUserId: connectedUserId,
      ...(user.name ? { realName: user.name } : {}),
      ...(user.email ? { realEmail: user.email } : {}),
      ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
      ...(user.provider ? { oauthProvider: user.provider } : {})
    });
  } else {
    await addTrace('createContactForConnection_noop', { userId, existingContactId: existingContact.id });
  }
}

export async function leaveGroup(userId: string, groupId: string): Promise<boolean> {
  const current = await getOrInitUserGroups(userId);
  const group = current.find((item) => item.id === groupId);
  if (!group) return false;

  const next = current.filter((item) => item.id !== groupId);
  groupsByUser.set(userId, next);
  await savePersisted(userId);
  return true;
}
