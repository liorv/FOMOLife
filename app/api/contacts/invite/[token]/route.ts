import { NextResponse } from 'next/server';
import type { InviterProfile } from '@myorg/types';
import { getInviteDetails } from '@/lib/contacts/server/contactsStore';

function corsResponse(response: NextResponse, request?: Request) {
  const origin = request?.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
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

  try {
    const inviterProfile = await getInviteDetails(token);
    if (!inviterProfile) {
      return corsResponse(
        NextResponse.json(
          { error: 'not_found', message: 'Invitation not found or expired' },
          { status: 404 }
        ),
        request
      );
    }

    return corsResponse(NextResponse.json(inviterProfile), request);
  } catch (error: any) {
    if (error.message === 'Invitation expired') {
      return corsResponse(
        NextResponse.json(
          { error: 'expired', message: 'Invitation link has expired' },
          { status: 410 }
        ),
        request
      );
    }
    return corsResponse(
      NextResponse.json(
        { error: 'invalid', message: 'Invalid invitation token' },
        { status: 400 }
      ),
      request
    );
  }
}
