import { NextResponse } from 'next/server';
import { getContactsSession } from '@/lib/server/auth';
import jwt from 'jsonwebtoken';
import {
  findInviteByToken,
  invalidateInviteToken,
  findUserById,
} from '@/lib/server/contactsStore';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function corsResponse(response: NextResponse, request?: Request) {
  const origin = request?.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function GET(
  request: Request,
  ctx: { params: { token: string } | Promise<{ token: string }> }
) {
  // params may be a promise in newer Next versions, so unwrap it first
  const { token } = await ctx.params;
  console.log('[invite GET] received', token);
  // verify the JWT upfront so we can classify expired/invalid tokens
  try {
    jwt.verify(token, process.env.INVITE_SECRET || 'default-invite-secret');
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return corsResponse(
        NextResponse.json(
          { error: 'expired', message: 'Invitation link has expired' },
          { status: 410 }
        ),
        request
      );
    }
    // treat other verification errors as not found to avoid leaking
    // token validity, matching prior behaviour
    return corsResponse(
      NextResponse.json(
        { error: 'not_found', message: 'Invitation not found or already used' },
        { status: 404 }
      ),
      request
    );
  }

  const invite = await findInviteByToken(token);
  if (!invite) {
    return corsResponse(
      NextResponse.json(
        { error: 'not_found', message: 'Invitation not found or already used' },
        { status: 404 }
      ),
      request
    );
  }

  const inviter = await findUserById(invite.ownerId);

  // determine whether the current session belongs to the inviter; if so, the
  // caller is following their own link.
  const session = await getContactsSession();
  const selfInvite = session.isAuthenticated && session.userId === invite.inviterId;

  return corsResponse(
    NextResponse.json({
      inviterName: inviter.name || inviter.email,
      contactName: invite.contactName,
      selfInvite,
    }),
    request
  );
}

export async function DELETE(
  request: Request,
  ctx: { params: { token: string } | Promise<{ token: string }> }
) {
  // params may be a promise in newer Next versions, so unwrap it first
  const { token } = await ctx.params;

  // reject should work even if the caller isn't logged in; possession of
  // the valid token is sufficient authority.  We still log who performed it
  // if a session exists.
  const session = await getContactsSession();
  if (session.isAuthenticated) {
    console.log('[invite DELETE] by', session.userId);
  }

  console.log('[invite DELETE] received', token);

  const invite = await findInviteByToken(token);
  if (!invite) {
    return corsResponse(NextResponse.json({ error: 'invalid' }, { status: 404 }), request);
  }

  await invalidateInviteToken(token);
  return corsResponse(NextResponse.json({ ok: true }), request);
}
