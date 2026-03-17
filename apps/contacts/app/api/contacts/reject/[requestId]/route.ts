import { NextResponse } from 'next/server';
import { rejectRequest } from '@/lib/server/contactsStore';
import { getContactsSession } from '@/lib/server/auth';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function corsResponse(response: NextResponse, request?: Request) {
  const origin = request?.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function DELETE(
  request: Request,
  ctx: { params: { requestId: string } | Promise<{ requestId: string }> }
) {
  const session = await getContactsSession();
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
