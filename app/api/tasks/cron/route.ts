import { NextResponse } from 'next/server';
import { runTaskDueNotificationsJob } from '@/lib/tasks/server/taskNotificationsStore';
import { listAllUsersData } from '@/lib/tasks/server/allUsersData';
import { listProjects } from '@/lib/projects/server/projectsStore';
import { scanRoadmapNotifications } from '@/lib/projects/server/roadmapNotifications';

/**
 * GET /api/tasks/cron
 * Scans task due dates, project deadlines, and milestone achievements and
 * sends notifications per user settings. Intended to be invoked
 * once per day by a scheduler (e.g. Vercel Cron).
 *
 * If CRON_SECRET is set, requests must include a matching
 * `Authorization: Bearer <secret>` header (Vercel Cron sends this
 * automatically when the env var is configured).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await runTaskDueNotificationsJob();
    let roadmapNotified = 0;
    for (const { userId } of await listAllUsersData()) {
      roadmapNotified += await scanRoadmapNotifications(userId, await listProjects(userId));
    }
    return NextResponse.json({ ok: true, ...result, roadmapNotified });
  } catch (err) {
    console.error('[tasks/cron] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
