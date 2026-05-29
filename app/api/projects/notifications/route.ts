import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import {
  listProjectNotifications,
  getProjectNotifUnreadCount,
  markProjectNotificationsRead,
} from '@/lib/projects/server/projectCommentsStore';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET() {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const [notifications, unreadCount] = await Promise.all([
    listProjectNotifications(session.userId),
    getProjectNotifUnreadCount(session.userId),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const body = (await request.json()) as { ids?: string[] };
  await markProjectNotificationsRead(session.userId, body.ids ?? []);
  return NextResponse.json({ ok: true });
}
