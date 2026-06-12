import { NextResponse } from 'next/server';
import { runDailySnapshotJob } from '@/lib/admin/adminMetricsStore';

/**
 * GET /api/admin/cron
 * Intended to be called by a cron scheduler (e.g. Vercel Cron) once per day.
 *
 * Example Vercel vercel.json cron:
 *   { "path": "/api/admin/cron", "schedule": "0 2 * * *" }
 */
export async function GET() {
  try {
    const snapshot = await runDailySnapshotJob();
    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    console.error('[admin/cron] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
