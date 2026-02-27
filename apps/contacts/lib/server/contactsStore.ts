import 'server-only';

import type { Contact } from '@myorg/types';

const contactsByUser = new Map<string, Contact[]>();

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
    { id: 'c1', name: 'Alex', login: 'alex@example.com', status: 'accepted', inviteToken: null },
    { id: 'c2', name: 'Mia', login: '', status: 'invited', inviteToken: 'mia_invite_123' },
  ];
  contactsByUser.set(userId, seed);
  return seed;
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
    status: input.status ?? 'none',
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
