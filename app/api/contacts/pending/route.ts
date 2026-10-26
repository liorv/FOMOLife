export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import type { PendingRequestsResponse } from '@myorg/types';
import { getPendingRequests } from '@/lib/contacts/server/contactsStore';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { unauthorizedResponse, makeCorsResponse } from '@/lib/server/apiUtils';
import { getTaskNotificationSettings } from '@/lib/server/notificationSettings';

const corsResponse = makeCorsResponse('GET,OPTIONS');

export async function OPTIONS(request: Request) {
  return corsResponse(NextResponse.json({}), request);
}

export async function GET(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const pendingRequests = await getPendingRequests(session.userId);
  const settings = await getTaskNotificationSettings(session.userId);
  const response: PendingRequestsResponse = { requests: pendingRequests, notificationsEnabled: settings.enabled };
  return corsResponse(NextResponse.json(response), request);
}