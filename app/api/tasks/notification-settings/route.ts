import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import {
  getTaskNotificationSettings,
  saveTaskNotificationSettings,
} from '@/lib/tasks/server/taskNotificationsStore';
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

  const body = await request.json();
  if (!isValidSettings(body)) {
    return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
  }

  await saveTaskNotificationSettings(session.userId, body);
  return NextResponse.json({ ok: true });
}
