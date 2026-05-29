export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import type { PendingRequestsResponse } from '@myorg/types';
import { getPendingRequests } from '@/lib/contacts/server/contactsStore';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { unauthorizedResponse, makeCorsResponse } from '@/lib/server/apiUtils';

const corsResponse = makeCorsResponse('GET,OPTIONS');

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function GET(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const pendingRequests = await getPendingRequests(session.userId);
  const response: PendingRequestsResponse = { requests: pendingRequests };
  return corsResponse(NextResponse.json(response), request);
}