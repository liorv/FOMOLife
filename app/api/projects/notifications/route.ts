import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import {
  listProjectNotifications,
  getProjectNotifUnreadCount,
  markProjectNotificationsRead,
  dismissProjectNotifications,
} from '@/lib/projects/server/projectCommentsStore';
import { listProjects } from '@/lib/projects/server/projectsStore';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const { searchParams } = new URL(request.url);
  const showDismissed = searchParams.get('dismissed') === '1';

  const all = await listProjectNotifications(session.userId);

  // Auto-dismiss notifications for tasks that no longer exist
  const staleDismissIds: string[] = [];
  try {
    const projects = await listProjects(session.userId);
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    for (const n of all) {
      if (n.dismissed) continue;
      if (n.taskId) {
        const project = projectMap.get(n.projectId);
        if (!project) { staleDismissIds.push(n.id); continue; }
        const allTasks = project.subprojects.flatMap((sp) => sp.tasks ?? []);
        if (!allTasks.find((t) => t.id === n.taskId)) staleDismissIds.push(n.id);
      } else {
        if (!projectMap.has(n.projectId)) staleDismissIds.push(n.id);
      }
    }
  } catch { /* non-critical */ }
  if (staleDismissIds.length > 0) {
    await dismissProjectNotifications(session.userId, staleDismissIds);
    // Reload after auto-dismiss
    const refreshed = await listProjectNotifications(session.userId);
    const visible = showDismissed ? refreshed.filter((n) => n.dismissed) : refreshed.filter((n) => !n.dismissed);
    const unreadCount = refreshed.filter((n) => !n.read && !n.dismissed).length;
    return NextResponse.json({ notifications: visible, unreadCount });
  }

  const notifications = showDismissed ? all.filter((n) => n.dismissed) : all.filter((n) => !n.dismissed);
  const unreadCount = all.filter((n) => !n.read && !n.dismissed).length;
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const body = (await request.json()) as { ids?: string[]; action?: 'read' | 'dismiss' };
  const ids = body.ids ?? [];
  if (body.action === 'dismiss') {
    await dismissProjectNotifications(session.userId, ids);
  } else {
    await markProjectNotificationsRead(session.userId, ids);
  }
  return NextResponse.json({ ok: true });
}
