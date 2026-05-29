import { NextResponse } from 'next/server';
import { leaveGroup } from '@/lib/contacts/server/contactsStore';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { unauthorizedResponse, makeCorsResponse } from '@/lib/server/apiUtils';

const corsResponse = makeCorsResponse('POST,OPTIONS');

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  // groupId from URL param, e.g. /api/contacts/groups/:id/leave
  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const groupId = parts[parts.length - 2];
  if (!groupId) {
    return corsResponse(NextResponse.json({ error: 'groupId required' }, { status: 400 }), request);
  }

  const ok = await leaveGroup(session.userId, groupId);
  if (!ok) {
    return corsResponse(NextResponse.json({ error: 'invalid groupId' }, { status: 404 }), request);
  }

  return corsResponse(NextResponse.json({ ok: true }), request);
}
