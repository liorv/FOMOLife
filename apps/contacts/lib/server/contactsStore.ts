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
  const payload = { inviter: userId, contactId };
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
  input: Pick<Contact, 'name'> & Partial<Pick<Contact, 'login' | 'status' | 'inviteToken'>>,
): Promise<Contact> {
  const current = getOrInitUserContacts(userId);
  const contact: Contact = {
    id: generateId(),
    name: input.name,
    login: input.login ?? '',
    status: input.status ?? 'not_linked',
    inviteToken: input.inviteToken ?? null,
  };
  current.push(contact);
  contactsByUser.set(userId, current);
  return contact;
}

export async function updateContact(
  userId: string,
  id: string,
  patch: Partial<Pick<Contact, 'name' | 'login' | 'status' | 'inviteToken'>>,
): Promise<Contact | null> {
  const current = getOrInitUserContacts(userId);
  const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
  const updated = next.find((item) => item.id === id) ?? null;
  contactsByUser.set(userId, next);
  return updated;
}

export async function deleteContact(userId: string, id: string): Promise<boolean> {
  const current = getOrInitUserContacts(userId);
  const next = current.filter((item) => item.id !== id);
  contactsByUser.set(userId, next);
  return next.length !== current.length;
}

// invite acceptance helpers
export async function findContactByInviteToken(token: InviteToken): Promise<{ userId: string; contact: Contact } | null> {
  for (const [uid, contacts] of contactsByUser.entries()) {
    const found = contacts.find((c) => c.inviteToken === token);
    if (found) return { userId: uid, contact: found };
  }
  return null;
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

  // mark inviter side as linked and clear token
  await updateContact(match.userId, match.contact.id, { status: 'linked', inviteToken: null });

  // create reciprocal contact for acceptor
  const nameForAcceptor = match.contact.login || match.contact.name || '';
  const newContact: Contact = await createContact(userId, {
    name: nameForAcceptor,
    ...(match.contact.login ? { login: match.contact.login } : {}),
    status: 'linked',
  });

  return newContact;
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
