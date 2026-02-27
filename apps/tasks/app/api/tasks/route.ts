import { NextResponse } from 'next/server';

import { getTasksSession } from '@/lib/server/tasksAuth';
import { createTask, deleteTask, listTasks, updateTask } from '@/lib/server/tasksStore';
import type { TaskItem } from '@/lib/server/tasksStore';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET() {
  const session = await getTasksSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const tasks = await listTasks(session.userId);
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const session = await getTasksSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as {
    text?: string;
    dueDate?: string | null;
    description?: string;
    favorite?: boolean;
  };

  if (!body.text || !body.text.trim()) {
    return NextResponse.json({ error: 'Task text is required' }, { status: 400 });
  }

  const created = await createTask(session.userId, {
    text: body.text.trim(),
    dueDate: body.dueDate ?? null,
    description: body.description ?? '',
    favorite: Boolean(body.favorite),
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getTasksSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as {
    id?: string;
    patch?: Partial<Pick<TaskItem, 'text' | 'done' | 'dueDate' | 'favorite' | 'description'>>;
  };

  if (!body.id || !body.patch) {
    return NextResponse.json({ error: 'id and patch are required' }, { status: 400 });
  }

  const updated = await updateTask(session.userId, body.id, body.patch);
  if (!updated) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await getTasksSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const removed = await deleteTask(session.userId, body.id);
  if (!removed) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}