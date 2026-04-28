import { NextResponse } from 'next/server';

import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { createProject, deleteProject, listProjects, updateProject, resolveProjectOwner, removeSharedProjectRef } from '@/lib/projects/server/projectsStore';
import type { ProjectItem } from '@myorg/types';

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const projects = await listProjects(session.userId);
  let didUpgrade = false;

  for (const project of projects) {
    if (!project.members || project.members.length === 0) {
      const ownerUserId = await resolveProjectOwner(project.id, session.userId);
      // Only auto-upgrade if the user actually owns this legacy project
      if (ownerUserId === session.userId) {
        const creatorMember = {
          userId: session.userId,
          name: session.userName || session.userId,
          ...(session.userAvatarUrl ? { avatarUrl: session.userAvatarUrl } : {}),
        };
        await updateProject(session.userId, project.id, { members: [creatorMember] });
        didUpgrade = true;
      }
    }
  }

  const returnProjects = didUpgrade ? await listProjects(session.userId) : projects;
  return NextResponse.json({ projects: returnProjects });
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const body = (await request.json()) as { text?: string; color?: string; progress?: number; order?: number; subprojects?: any[]; goal?: string; description?: string; dueDate?: string | null; aiInstructions?: string; avatarUrl?: string };
  if (!body?.text || !body.text.trim()) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
  }

  // Seed the creator as the first member so membership is always explicit
  const creatorMember = {
    userId: session.userId,
    name: session.userName || session.userId,
    ...(session.userAvatarUrl ? { avatarUrl: session.userAvatarUrl } : {}),
  };

  const created = await createProject(session.userId, {
    text: body.text.trim(),
    members: [creatorMember],
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

  const body = (await request.json()) as { id?: string; patch?: Partial<Pick<ProjectItem, 'text' | 'color' | 'subprojects' | 'progress' | 'order' | 'goal' | 'description' | 'dueDate' | 'aiInstructions' | 'avatarUrl' | 'members'>> };
  if (!body?.id || !body.patch) {
    return NextResponse.json({ error: 'id and patch are required' }, { status: 400 });
  }

  const ownerUserId = await resolveProjectOwner(body.id, session.userId);
  const updated = await updateProject(ownerUserId, body.id, body.patch);
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

  const projects = await listProjects(session.userId);
  const project = projects.find((p) => p.id === body.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const members = project.members ?? [];
  const isLegacyOwner = members.length === 0;
  const isSoleMember = members.length === 1 && members[0]!.userId === session.userId;
  if (!isSoleMember && !isLegacyOwner) {
    return NextResponse.json({ error: 'Can only delete project if you are the sole member' }, { status: 403 });
  }

  // Resolve the owner and delete from their projects
  const ownerUserId = await resolveProjectOwner(body.id, session.userId);
  const removed = await deleteProject(ownerUserId, body.id);
  if (!removed) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }

  // Remove the shared project reference for the user (though as sole member, it might be the owner)
  await removeSharedProjectRef(session.userId, body.id);

  return NextResponse.json({ ok: true });
}
