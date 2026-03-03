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

function corsResponse(response: NextResponse, request?: Request) {
  const origin = request?.headers.get('origin') || '*';
  // when credentials are included we must echo the origin instead of '*'
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS(request: Request) {
  // preflight handler
  return corsResponse(NextResponse.json({}), request);
}

export async function GET(request: Request) {
  const session = await getContactsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const contacts = await listContacts(session.userId);
  const payload: ContactsListResponse = { contacts };
  return corsResponse(NextResponse.json(payload), request);
}

export async function POST(request: Request) {
  const session = await getContactsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as CreateContactRequest;
  if (!body?.name || !body.name.trim()) {
    return corsResponse(NextResponse.json({ error: 'Name is required' }, { status: 400 }), request);
  }

  const created = await createContact(session.userId, {
    name: body.name.trim(),
    ...(typeof body.login === 'string' ? { login: body.login } : {}),
    inviteToken: body.inviteToken ?? null,
    status: body.inviteToken ? 'link_pending' : 'not_linked',
  });
  return corsResponse(NextResponse.json(created, { status: 201 }), request);
}

export async function PATCH(request: Request) {
  const session = await getContactsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { id?: string; patch?: UpdateContactRequest };
  if (!body?.id || !body.patch) {
    return corsResponse(NextResponse.json({ error: 'id and patch are required' }, { status: 400 }), request);
  }

  const updated = await updateContact(session.userId, body.id, body.patch);
  if (!updated) {
    return corsResponse(NextResponse.json({ error: 'Contact not found' }, { status: 404 }), request);
  }

  return corsResponse(NextResponse.json(updated), request);
}

export async function DELETE(request: Request) {
  const session = await getContactsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { id?: string };
  if (!body?.id) {
    return corsResponse(NextResponse.json({ error: 'id is required' }, { status: 400 }), request);
  }

  const removed = await deleteContact(session.userId, body.id);
  if (!removed) {
    return corsResponse(NextResponse.json({ error: 'Contact not found' }, { status: 404 }), request);
  }

  return corsResponse(NextResponse.json({ ok: true }), request);
}
