import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import {
  listNotifications,
  markNotificationsRead,
  dismissNotifications,
  listFeedback,
} from '@/lib/feedback/server/feedbackStore';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const { searchParams } = new URL(request.url);
  const showDismissed = searchParams.get('dismissed') === '1';

  const all = await listNotifications(session.userId);

  // Auto-dismiss notifications for feedback items that no longer exist
  const staleDismissIds: string[] = [];
  try {
    const items = await listFeedback();
    const itemIds = new Set(items.map((i) => i.id));
    for (const n of all) {
      if (!n.dismissed && !itemIds.has(n.feedbackId)) staleDismissIds.push(n.id);
    }
  } catch { /* non-critical */ }
  if (staleDismissIds.length > 0) {
    await dismissNotifications(session.userId, staleDismissIds);
    const refreshed = await listNotifications(session.userId);
    const visible = showDismissed ? refreshed.filter((n) => n.dismissed) : refreshed.filter((n) => !n.dismissed);
    const unreadCount = refreshed.filter((n) => !n.read && !n.dismissed).length;
    return NextResponse.json({ notifications: visible, unreadCount });
  }

  const notifications = showDismissed
    ? all.filter((n) => n.dismissed)
    : all.filter((n) => !n.dismissed);
  const unreadCount = all.filter((n) => !n.read && !n.dismissed).length;
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const body = (await request.json()) as { ids?: string[]; action?: 'read' | 'dismiss' };
  const ids = body.ids ?? [];
  if (body.action === 'dismiss') {
    await dismissNotifications(session.userId, ids);
  } else {
    // ids = [] means mark all
    await markNotificationsRead(session.userId, ids);
  }
  return NextResponse.json({ ok: true });
}
