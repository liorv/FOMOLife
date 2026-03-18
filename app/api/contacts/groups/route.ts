export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import type { ContactGroup, ContactGroupInput } from '@myorg/types';
import { createGroup, deleteGroup, listGroups, updateGroup } from '@/lib/contacts/server/contactsStore';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function corsResponse(response: NextResponse, request?: Request) {
  const origin = request?.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function GET(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const groups = await listGroups(session.userId);
  return corsResponse(NextResponse.json({ groups }), request);
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as ContactGroupInput;
  if (!body?.name || !body.name.trim()) {
    return corsResponse(NextResponse.json({ error: 'name is required' }, { status: 400 }), request);
  }

  const created = await createGroup(session.userId, { name: body.name.trim(), contactIds: body.contactIds ?? [] });
  return corsResponse(NextResponse.json(created, { status: 201 }), request);
}

export async function PATCH(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { id?: string; patch?: ContactGroupInput };
  if (!body?.id || !body.patch) {
    return corsResponse(NextResponse.json({ error: 'id and patch are required' }, { status: 400 }), request);
  }

  const updated = await updateGroup(session.userId, body.id, body.patch);
  if (!updated) {
    return corsResponse(NextResponse.json({ error: 'Group not found' }, { status: 404 }), request);
  }

  return corsResponse(NextResponse.json(updated), request);
}

export async function DELETE(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { id?: string };
  if (!body?.id) {
    return corsResponse(NextResponse.json({ error: 'id is required' }, { status: 400 }), request);
  }

  const removed = await deleteGroup(session.userId, body.id);
  if (!removed) {
    return corsResponse(NextResponse.json({ error: 'Group not found' }, { status: 404 }), request);
  }

  return corsResponse(NextResponse.json({ ok: true }), request);
}