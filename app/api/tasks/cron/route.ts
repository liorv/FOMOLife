import { NextResponse } from 'next/server';
import { runTaskDueNotificationsJob } from '@/lib/tasks/server/taskNotificationsStore';

/**
 * GET /api/tasks/cron
 * Scans every user's tasks for upcoming due dates and sends reminder
 * notifications per their notification settings. Intended to be invoked
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
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[tasks/cron] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
