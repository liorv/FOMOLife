import { NextResponse } from 'next/server';

import type { InviteAcceptanceRequest } from '@myorg/types';
import { acceptInvite } from '@/lib/server/contactsStore';
import { getContactsSession } from '@/lib/server/auth';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function corsResponse(response: NextResponse, request?: Request) {
  const origin = request?.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function POST(request: Request) {
  const session = await getContactsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as InviteAcceptanceRequest;
  if (!body?.token) {
    return corsResponse(NextResponse.json({ error: 'token required' }, { status: 400 }), request);
  }

  const accepted = await acceptInvite(session.userId, body.token);
  if (!accepted) {
    return corsResponse(NextResponse.json({ error: 'invalid token' }, { status: 404 }), request);
  }

  return corsResponse(NextResponse.json(accepted), request);
}