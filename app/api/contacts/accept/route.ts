export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import type { InviteAcceptanceRequest } from '@myorg/types';
import { acceptInvite, SelfInvitationError } from '@/lib/contacts/server/contactsStore';
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

  try {
    const accepted = await acceptInvite(session.userId, body.token);
    if (!accepted) {
      return corsResponse(NextResponse.json({ error: 'invalid token' }, { status: 404 }), request);
    }
    return corsResponse(NextResponse.json(accepted), request);
  } catch (err: any) {
    if (err instanceof SelfInvitationError) {
      return corsResponse(
        NextResponse.json(
          { error: 'self_invite', message: 'You cannot accept your own invitation.' },
          { status: 400 }
        ),
        request
      );
    }
    throw err; // propagate unexpected errors
  }
}