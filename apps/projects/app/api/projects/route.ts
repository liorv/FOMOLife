import { NextResponse } from 'next/server';

import { getProjectsSession } from '@/lib/server/projectsAuth';
import { createProject, deleteProject, listProjects, updateProject } from '@/lib/server/projectsStore';
import type { ProjectItem } from '@/lib/server/projectsStore';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET() {
  const session = await getProjectsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const projects = await listProjects(session.userId);
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const session = await getProjectsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { text?: string; color?: string; progress?: number; order?: number };
  if (!body?.text || !body.text.trim()) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
  }

  const created = await createProject(session.userId, {
    text: body.text.trim(),
    ...(body.color ? { color: body.color } : {}),
    ...(typeof body.progress === 'number' ? { progress: body.progress } : {}),
    ...(typeof body.order === 'number' ? { order: body.order } : {}),
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getProjectsSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { id?: string; patch?: Partial<Pick<ProjectItem, 'text' | 'color' | 'subprojects' | 'progress' | 'order'>> };
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
  const session = await getProjectsSession();
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
