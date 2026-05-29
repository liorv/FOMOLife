import { NextResponse } from 'next/server';
import { approveRequest } from '@/lib/contacts/server/contactsStore';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { unauthorizedResponse, makeCorsResponse } from '@/lib/server/apiUtils';

const corsResponse = makeCorsResponse('PATCH,OPTIONS');

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function PATCH(
  request: Request,
  ctx: { params: { requestId: string } | Promise<{ requestId: string }> }
) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const { requestId } = await ctx.params;

  try {
    await approveRequest(session.userId, requestId);
    return corsResponse(NextResponse.json({ ok: true }), request);
  } catch (error: any) {
    return corsResponse(
      NextResponse.json(
        { error: 'approval_failed', message: error.message || 'Failed to approve request' },
        { status: 400 }
      ),
      request
    );
  }
}