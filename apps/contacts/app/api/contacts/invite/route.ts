import { NextResponse } from 'next/server';
import type { InviteTokenResponse } from '@myorg/types';
import { inviteContact } from '@/lib/server/contactsStore';
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

  const body = (await request.json()) as { contactId?: string };
  if (!body?.contactId) {
    return corsResponse(NextResponse.json({ error: 'contactId required' }, { status: 400 }), request);
  }

  const inviteToken = await inviteContact(session.userId, body.contactId);
  if (!inviteToken) {
    return corsResponse(NextResponse.json({ error: 'invalid contactId' }, { status: 404 }), request);
  }

  // construct a user-facing URL (in real app this would be emailed)
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  const inviteLink = `${base}/accept-invite?token=${encodeURIComponent(inviteToken)}`;
  console.log(`Invitation link: ${inviteLink}`);

  const response: InviteTokenResponse & { inviteLink?: string } = { inviteToken, inviteLink };
  return corsResponse(NextResponse.json(response), request);
}
