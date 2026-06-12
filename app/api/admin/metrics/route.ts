import { NextResponse } from 'next/server';
import { loadAdminMetrics } from '@/lib/admin/adminMetricsStore';

/**
 * GET /api/admin/metrics
 */
export async function GET() {
  try {
    const metrics = await loadAdminMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    console.error('[admin/metrics] error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
