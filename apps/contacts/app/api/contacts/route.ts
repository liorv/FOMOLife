import { NextResponse } from 'next/server';

import type {
  ContactsListResponse,
  CreateContactRequest,
  UpdateContactRequest,
} from '@myorg/api-client';
import { createContact, deleteContact, listContacts, updateContact } from '@/lib/server/contactsStore';
import { getContactsSession } from '@/lib/server/auth';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET() {
  const session = await getContactsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const contacts = await listContacts(session.userId);
  const payload: ContactsListResponse = { contacts };
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const session = await getContactsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as CreateContactRequest;
  if (!body?.name || !body.name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const created = await createContact(session.userId, {
    name: body.name.trim(),
    ...(typeof body.login === 'string' ? { login: body.login } : {}),
    inviteToken: body.inviteToken ?? null,
    status: body.inviteToken ? 'invited' : 'none',
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getContactsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { id?: string; patch?: UpdateContactRequest };
  if (!body?.id || !body.patch) {
    return NextResponse.json({ error: 'id and patch are required' }, { status: 400 });
  }

  const updated = await updateContact(session.userId, body.id, body.patch);
  if (!updated) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await getContactsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { id?: string };
  if (!body?.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const removed = await deleteContact(session.userId, body.id);
  if (!removed) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
