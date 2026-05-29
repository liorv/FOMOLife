export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import type { GenerateInviteResponse } from '@myorg/types';
import { generateInviteLink, deleteActiveInviteLink } from '@/lib/contacts/server/contactsStore';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { unauthorizedResponse, makeCorsResponse } from '@/lib/server/apiUtils';

const corsResponse = makeCorsResponse('POST,DELETE,OPTIONS');

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
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
  const session = await getFrameworkSession();
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

export async function GET(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const { getActiveInviteLink } = await import('@/lib/contacts/server/contactsStore');
  const inviteResponse = await getActiveInviteLink(session.userId);
  if (!inviteResponse) {
    return corsResponse(NextResponse.json({ active: false }), request);
  }
  
  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;
  const inviteLink = `${base}/accept-invite?token=${encodeURIComponent(inviteResponse.token)}`;
  
  return corsResponse(NextResponse.json({
    active: true,
    inviteLink,
    token: inviteResponse.token,
    expiresAt: inviteResponse.expiresAt
  }), request);
}
