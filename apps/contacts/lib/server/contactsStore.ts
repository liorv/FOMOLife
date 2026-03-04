import 'server-only';

import type { Contact, InviteToken, ContactGroup, ContactGroupInput } from '@myorg/types';

import jwt from 'jsonwebtoken';

const contactsByUser = new Map<string, Contact[]>();
// simple in-memory groups per user
const groupsByUser = new Map<string, ContactGroup[]>();
const groupInviteByToken = new Map<string, { ownerUserId: string; groupId: string; contactId: string }>();

// secret used to sign invite JWTs; should be set in environment
const INVITE_SECRET = process.env.INVITE_SECRET || 'default-invite-secret';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function getOrInitUserContacts(userId: string): Contact[] {
  const existing = contactsByUser.get(userId);
  if (existing) return existing;

  const seed: Contact[] = [
    // example seeded contacts using new status values
    { id: 'c1', name: 'Alex', login: 'alex@example.com', status: 'linked', inviteToken: null },
    { id: 'c2', name: 'Mia', login: '', status: 'link_pending', inviteToken: 'mia_invite_123' },
  ];
  contactsByUser.set(userId, seed);
  return seed;
}

// Generates and assigns an invite token to a contact, returns the token string
export async function inviteContact(userId: string, contactId: string): Promise<string | null> {
  const current = getOrInitUserContacts(userId);
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
  return token;
}

export async function listContacts(userId: string): Promise<Contact[]> {
  return [...getOrInitUserContacts(userId)];
}

export async function createContact(
  userId: string,
  input: Pick<Contact, 'name'> & Partial<Pick<Contact, 'login' | 'status' | 'inviteToken' | 'linkedUserId'>>,
): Promise<Contact> {
  const current = getOrInitUserContacts(userId);
  
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
  };
  current.push(contact);
  contactsByUser.set(userId, current);
  return contact;
}

export async function updateContact(
  userId: string,
  id: string,
  patch: Partial<Pick<Contact, 'name' | 'login' | 'status' | 'inviteToken' | 'linkedUserId'>>,
): Promise<Contact | null> {
  const current = getOrInitUserContacts(userId);
  
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
  return updated;
}

export async function unlinkContact(userId: string, contactId: string): Promise<boolean> {
  const current = getOrInitUserContacts(userId);
  const contactIndex = current.findIndex((item) => item.id === contactId);
  if (contactIndex === -1) return false;

  const contact = current[contactIndex];
  
  // Change this contact's status to 'not_linked'
  current[contactIndex] = { ...contact, status: 'not_linked', inviteToken: null };
  contactsByUser.set(userId, current);

  // If this contact represents a linked user, also unlink the reciprocal contact
  if (contact.linkedUserId) {
    const reciprocalContacts = getOrInitUserContacts(contact.linkedUserId);
    // update all reciprocal contacts that point back to this user
    const updatedRecips = reciprocalContacts.map((c) =>
      c.linkedUserId === userId ? { ...c, status: 'not_linked', inviteToken: null } : c
    );
    contactsByUser.set(contact.linkedUserId, updatedRecips);
  }

  return true;
}

export async function deleteContact(userId: string, contactId: string): Promise<boolean> {
  const current = getOrInitUserContacts(userId);
  const contactIndex = current.findIndex((item) => item.id === contactId);
  if (contactIndex === -1) return false;

  const contact = current[contactIndex];

  // Remove the contact from this user's list
  const next = current.filter((item) => item.id !== contactId);
  contactsByUser.set(userId, next);

  // If this contact represents a linked user, also unlink the reciprocal contact
  // (change status to 'not_linked' but keep it in their list)
  if (contact.linkedUserId) {
    const reciprocalContacts = getOrInitUserContacts(contact.linkedUserId);
    // update all reciprocal contacts that point back to this user
    const updatedRecips = reciprocalContacts.map((c) =>
      c.linkedUserId === userId ? { ...c, status: 'not_linked', inviteToken: null } : c
    );
    contactsByUser.set(contact.linkedUserId, updatedRecips);
  }

  return true;
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
  const contacts = getOrInitUserContacts(decoded.inviter);
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
    console.log('[store] jwt.decode failed', err?.name || err);
    return null;
  }
  if (!decoded) {
    return null;
  }
  const contacts = getOrInitUserContacts(decoded.inviter);
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

export async function findUserById(userId: string): Promise<{ id: string; name?: string; email?: string }> {
  // in this simple in-memory demo we don't have a real user store,
  // so just return the id as the name/email. replace with real lookup
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
  const acceptorContacts = getOrInitUserContacts(userId);
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
    })!;
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
function getOrInitUserGroups(userId: string): ContactGroup[] {
  const existing = groupsByUser.get(userId);
  if (existing) return existing;

  const seed: ContactGroup[] = [];
  groupsByUser.set(userId, seed);
  return seed;
}

export async function listGroups(userId: string): Promise<ContactGroup[]> {
  return [...getOrInitUserGroups(userId)];
}

export async function createGroup(userId: string, input: ContactGroupInput): Promise<ContactGroup> {
  const current = getOrInitUserGroups(userId);
  const group: ContactGroup = {
    id: generateId(),
    name: input.name,
    contactIds: 'contactIds' in input && Array.isArray((input as ContactGroupInput & { contactIds?: string[] }).contactIds)
      ? ((input as ContactGroupInput & { contactIds?: string[] }).contactIds ?? [])
      : [],
  };
  current.push(group);
  groupsByUser.set(userId, current);
  return group;
}

export async function inviteToGroup(userId: string, groupId: string, contactId: string): Promise<string | null> {
  const current = getOrInitUserGroups(userId);
  const group = current.find((item) => item.id === groupId);
  if (!group) return null;

  const token = `grp_${groupId}_${Math.random().toString(36).slice(2, 10)}`;
  groupInviteByToken.set(token, { ownerUserId: userId, groupId, contactId });
  return token;
}

export async function acceptGroupInvite(userId: string, token: string): Promise<ContactGroup | null> {
  const invite = groupInviteByToken.get(token);
  if (!invite) return null;

  const ownerGroups = getOrInitUserGroups(invite.ownerUserId);
  const group = ownerGroups.find((item) => item.id === invite.groupId);
  if (!group) return null;

  const contactExists = getOrInitUserContacts(userId).some((item) => item.id === invite.contactId);
  if (!contactExists) {
    groupInviteByToken.delete(token);
    return null;
  }

  if (!group.contactIds.includes(invite.contactId)) {
    group.contactIds = [...group.contactIds, invite.contactId];
    groupsByUser.set(invite.ownerUserId, ownerGroups);
  }

  groupInviteByToken.delete(token);
  return group;
}

export async function updateGroup(userId: string, id: string, patch: Partial<ContactGroupInput>): Promise<ContactGroup | null> {
  const current = getOrInitUserGroups(userId);
  const next = current.map((g) => (g.id === id ? { ...g, ...(patch.name ? { name: patch.name } : {}), ...(patch.contactIds ? { contactIds: patch.contactIds } : {}) } : g));
  const updated = next.find((g) => g.id === id) ?? null;
  groupsByUser.set(userId, next);
  return updated;
}

export async function deleteGroup(userId: string, id: string): Promise<boolean> {
  const current = getOrInitUserGroups(userId);
  const next = current.filter((g) => g.id !== id);
  groupsByUser.set(userId, next);
  return next.length !== current.length;
}

export async function leaveGroup(userId: string, groupId: string): Promise<boolean> {
  const current = getOrInitUserGroups(userId);
  const group = current.find((item) => item.id === groupId);
  if (!group) return false;

  const next = current.filter((item) => item.id !== groupId);
  groupsByUser.set(userId, next);
  return true;
}
