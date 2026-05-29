import { NextResponse } from 'next/server';
import type { InviteTokenResponse } from '@myorg/types';
import { inviteToGroup } from '@/lib/contacts/server/contactsStore';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { unauthorizedResponse, makeCorsResponse } from '@/lib/server/apiUtils';

const corsResponse = makeCorsResponse('POST,OPTIONS');

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { groupId?: string; contactId?: string };
  if (!body?.groupId || !body?.contactId) {
    return corsResponse(NextResponse.json({ error: 'groupId and contactId required' }, { status: 400 }), request);
  }

  const inviteToken = await inviteToGroup(session.userId, body.groupId, body.contactId);
  if (!inviteToken) {
    return corsResponse(NextResponse.json({ error: 'invalid groupId or contactId' }, { status: 404 }), request);
  }

  const response: InviteTokenResponse = { inviteToken };
  return corsResponse(NextResponse.json(response), request);
}
