import { NextResponse } from 'next/server';
import type { GenerateInviteResponse } from '@myorg/types';
import { generateInviteLink, deleteActiveInviteLink } from '@/lib/server/contactsStore';
import { getContactsSession } from '@/lib/server/auth';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function corsResponse(response: NextResponse, request?: Request) {
  const origin = request?.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'POST,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function POST(request: Request) {
  const session = await getContactsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const inviteResponse = await generateInviteLink(session.userId);
  if (!inviteResponse) {
    return corsResponse(NextResponse.json({ error: 'Failed to generate invite link' }, { status: 500 }), request);
  }

  // construct a user-facing URL (in real app this would be emailed)
  // prefer explicit base from env, otherwise derive from incoming request
  const url = new URL(request.url);
  const base =
    process.env.NEXT_PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;
  const inviteLink = `${base}/accept-invite?token=${encodeURIComponent(inviteResponse.token)}`;

  const response: GenerateInviteResponse = {
    inviteLink,
    token: inviteResponse.token,
    expiresAt: inviteResponse.expiresAt,
  };
  return corsResponse(NextResponse.json(response), request);
}


export async function DELETE(request: Request) {
  const session = await getContactsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  try {
    await deleteActiveInviteLink(session.userId);
    return corsResponse(NextResponse.json({ ok: true }), request);
  } catch (error: any) {
    return corsResponse(
      NextResponse.json(
        { error: 'deletion_failed', message: error.message || 'Failed to delete active invite link' },
        { status: 500 }
      ),
      request
    );
  }
}
