import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import {
  getTaskNotificationSettings,
  saveTaskNotificationSettings,
  DEFAULT_NOTIFICATION_EVENTS,
} from '@/lib/server/notificationSettings';
import type { TaskNotificationSettings, TaskNotifyBefore } from '@myorg/types';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

const VALID_NOTIFY_BEFORE: TaskNotifyBefore[] = ['7d', '1d', '0d', 'off'];

function isValidSettings(body: unknown): body is TaskNotificationSettings {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  for (const key of ['createdByMe', 'assignedToMe']) {
    const category = b[key] as Record<string, unknown> | undefined;
    if (!category || typeof category.enabled !== 'boolean') return false;
    if (!VALID_NOTIFY_BEFORE.includes(category.notifyBefore as TaskNotifyBefore)) return false;
  }
  if (b.events !== undefined) {
    if (!b.events || typeof b.events !== 'object' || Array.isArray(b.events)) return false;
    for (const [key, value] of Object.entries(b.events)) {
      if (!Object.hasOwn(DEFAULT_NOTIFICATION_EVENTS, key) || typeof value !== 'boolean') return false;
    }
  }
  return true;
}

export async function GET() {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const settings = await getTaskNotificationSettings(session.userId);
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
  if (!isValidSettings(body)) {
    return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
  }

  await saveTaskNotificationSettings(session.userId, body);
  return NextResponse.json({ ok: true });
}
