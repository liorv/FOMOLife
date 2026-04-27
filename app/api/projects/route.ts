import { NextResponse } from 'next/server';

import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { createProject, deleteProject, listProjects, updateProject } from '@/lib/projects/server/projectsStore';
import type { ProjectItem } from '@myorg/types';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const projects = await listProjects(session.userId);
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { text?: string; color?: string; progress?: number; order?: number; subprojects?: any[]; goal?: string; description?: string; dueDate?: string | null; aiInstructions?: string; avatarUrl?: string };
  if (!body?.text || !body.text.trim()) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
  }

  const created = await createProject(session.userId, {
    text: body.text.trim(),
    ...(body.color ? { color: body.color } : {}),
    ...(typeof body.progress === 'number' ? { progress: body.progress } : {}),
    ...(typeof body.order === 'number' ? { order: body.order } : {}),
    ...(Array.isArray(body.subprojects) ? { subprojects: body.subprojects } : {}),
    ...(body.goal ? { goal: body.goal } : {}),
    ...(body.description ? { description: body.description } : {}),
    ...(body.dueDate !== undefined ? { dueDate: body.dueDate } : {}),
    ...(body.aiInstructions ? { aiInstructions: body.aiInstructions } : {}),
    ...(body.avatarUrl ? { avatarUrl: body.avatarUrl } : {}),
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { id?: string; patch?: Partial<Pick<ProjectItem, 'text' | 'color' | 'subprojects' | 'progress' | 'order' | 'goal' | 'description' | 'dueDate' | 'aiInstructions' | 'avatarUrl'>> };
  if (!body?.id || !body.patch) {
    return NextResponse.json({ error: 'id and patch are required' }, { status: 400 });
  }

  const updated = await updateProject(session.userId, body.id, body.patch);
  if (!updated) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { id?: string };
  if (!body?.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const removed = await deleteProject(session.userId, body.id);
  if (!removed) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
