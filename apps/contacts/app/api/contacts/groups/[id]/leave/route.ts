import { NextResponse } from 'next/server';
import { leaveGroup } from '@/lib/server/contactsStore';
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
