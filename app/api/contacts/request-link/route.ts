export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import type { RequestLinkageRequest } from '@myorg/types';
import { requestLinkage } from '@/lib/contacts/server/contactsStore';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { unauthorizedResponse, makeCorsResponse } from '@/lib/server/apiUtils';

const corsResponse = makeCorsResponse('POST,OPTIONS');

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