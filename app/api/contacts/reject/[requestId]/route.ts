import { NextResponse } from 'next/server';
import { rejectRequest } from '@/lib/contacts/server/contactsStore';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { unauthorizedResponse, makeCorsResponse } from '@/lib/server/apiUtils';

const corsResponse = makeCorsResponse('DELETE,OPTIONS');

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function DELETE(
  request: Request,
  ctx: { params: { requestId: string } | Promise<{ requestId: string }> }
) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const { requestId } = await ctx.params;

  try {
    await rejectRequest(session.userId, requestId);
    return corsResponse(NextResponse.json({ ok: true }), request);
  } catch (error: any) {
    return corsResponse(
      NextResponse.json(
        { error: 'rejection_failed', message: error.message || 'Failed to reject request' },
        { status: 400 }
      ),
      request
    );
  }
}
