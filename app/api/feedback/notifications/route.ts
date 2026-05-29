import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import {
  listNotifications,
  markNotificationsRead,
} from '@/lib/feedback/server/feedbackStore';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET() {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const notifications = await listNotifications(session.userId);
  const unreadCount = notifications.filter((n) => !n.read).length;
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const body = (await request.json()) as { ids?: string[] };
  // ids = [] means mark all
  await markNotificationsRead(session.userId, body.ids ?? []);
  return NextResponse.json({ ok: true });
}
