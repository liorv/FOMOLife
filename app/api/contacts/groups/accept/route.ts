import { NextResponse } from 'next/server';
import type { InviteAcceptanceRequest, Group } from '@myorg/types';
import { acceptGroupInvite } from '@/lib/contacts/server/contactsStore';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { unauthorizedResponse, makeCorsResponse } from '@/lib/server/apiUtils';

const corsResponse = makeCorsResponse('POST,OPTIONS');

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as InviteAcceptanceRequest;
  if (!body?.token) {
    return corsResponse(NextResponse.json({ error: 'token required' }, { status: 400 }), request);
  }

  const group = await acceptGroupInvite(session.userId, body.token);
  if (!group) {
    return corsResponse(NextResponse.json({ error: 'invalid token' }, { status: 404 }), request);
  }

  return corsResponse(NextResponse.json(group), request);
}
