import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@myorg/storage';

/**
 * GET /api/admin/debug
 * Returns a summary of what keys exist in user_data rows to diagnose metrics issues.
 */
export async function GET() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data, error } = await supabase.from('user_data').select('user_id, data');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary = (data ?? []).map((row: Record<string, unknown>) => {
    const d = (row.data ?? {}) as Record<string, unknown>;
    const keys = Object.keys(d);
    return {
      userId: (row.user_id as string).slice(0, 20),
      keys,
      taskCount: Array.isArray(d.tasks) ? (d.tasks as unknown[]).length : null,
      projectCount: Array.isArray(d.projects) ? (d.projects as unknown[]).length : null,
      peopleCount: Array.isArray(d.people) ? (d.people as unknown[]).length : null,
      contactCount: Array.isArray(d.contacts) ? (d.contacts as unknown[]).length : null,
    };
  });

  return NextResponse.json({ rowCount: summary.length, summary });
}
