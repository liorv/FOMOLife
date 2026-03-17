import { NextResponse } from 'next/server';
import { approveRequest } from '@/lib/server/contactsStore';
import { getContactsSession } from '@/lib/server/auth';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function corsResponse(response: NextResponse, request?: Request) {
  const origin = request?.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'PATCH,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function PATCH(
  request: Request,
  ctx: { params: { requestId: string } | Promise<{ requestId: string }> }
) {
  const session = await getContactsSession();
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