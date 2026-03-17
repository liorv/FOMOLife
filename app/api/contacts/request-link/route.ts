import { NextResponse } from 'next/server';
import type { RequestLinkageRequest } from '@myorg/types';
import { requestLinkage } from '@/lib/contacts/server/contactsStore';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';

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
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as RequestLinkageRequest;
  if (!body?.token) {
    return corsResponse(NextResponse.json({ error: 'token required' }, { status: 400 }), request);
  }

  try {
    const result = await requestLinkage(session.userId, body.token);
    return corsResponse(NextResponse.json(result), request);
  } catch (error: any) {
    return corsResponse(
      NextResponse.json(
        { error: 'request_failed', message: error.message || 'Failed to request linkage' },
        { status: 400 }
      ),
      request
    );
  }
}