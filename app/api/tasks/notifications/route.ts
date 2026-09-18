import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import {
  listTaskDueNotifications,
  getTaskNotifUnreadCount,
  markTaskNotificationsRead,
  dismissTaskNotifications,
  rescheduleTaskNotification,
} from '@/lib/tasks/server/taskNotificationsStore';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const { searchParams } = new URL(request.url);
  const showDismissed = searchParams.get('dismissed') === '1';

  const all = await listTaskDueNotifications(session.userId);
  const notifications = showDismissed ? all.filter((n) => n.dismissed) : all.filter((n) => !n.dismissed);
  const unreadCount = showDismissed ? 0 : await getTaskNotifUnreadCount(session.userId);
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const body = (await request.json()) as {
    ids?: string[];
    action?: 'read' | 'dismiss' | 'remind_week' | 'remind_day';
    id?: string;
  };

  if (body.action === 'remind_week' || body.action === 'remind_day') {
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await rescheduleTaskNotification(session.userId, body.id, body.action === 'remind_week' ? 'week' : 'day');
    return NextResponse.json({ ok: true });
  }

  const ids = body.ids ?? [];
  if (body.action === 'dismiss') {
    await dismissTaskNotifications(session.userId, ids);
  } else {
    await markTaskNotificationsRead(session.userId, ids);
  }
  return NextResponse.json({ ok: true });
}
