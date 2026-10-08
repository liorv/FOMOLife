import { NextResponse } from 'next/server';

import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { unauthorizedResponse } from '@/lib/server/apiUtils';
import { createProject, deleteProject, listProjects, updateProject, resolveProjectOwner, removeSharedProjectRef } from '@/lib/projects/server/projectsStore';
import { notifyTaskCompleted, notifyTaskAssigned } from '@/lib/projects/server/projectCommentsStore';
import type { ProjectItem } from '@myorg/types';

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

  const body = (await request.json()) as { id?: string; patch?: Partial<Pick<ProjectItem, 'text' | 'color' | 'subprojects' | 'progress' | 'order' | 'goal' | 'description' | 'dueDate' | 'aiInstructions' | 'avatarUrl' | 'members' | 'preferences' | 'archived' | 'archivedAt'>> };
  if (!body?.id || !body.patch) {
    return NextResponse.json({ error: 'id and patch are required' }, { status: 400 });
  }

  const ownerUserId = await resolveProjectOwner(body.id, session.userId);

  // Before saving, detect tasks that are newly completed or newly assigned so we can notify members
  let newlyCompletedTasks: Array<{ id: string; text: string }> = [];
  let newlyAssignedTasks: Array<{ id: string; text: string; newAssigneeNames: string[] }> = [];
  if (Array.isArray(body.patch.subprojects)) {
    try {
      const existing = await listProjects(ownerUserId);
      const currentProject = existing.find((p) => p.id === body.id);
      if (currentProject) {
        // Build maps of taskId → done / assignee names from the CURRENT persisted state
        const currentDoneMap = new Map<string, boolean>();
        const currentPeopleMap = new Map<string, string[]>();
        for (const sub of currentProject.subprojects ?? []) {
          for (const task of sub.tasks ?? []) {
            currentDoneMap.set(task.id, task.done);
            currentPeopleMap.set(task.id, (task.people ?? []).map((p) => p.name));
          }
        }
        // Find any task in the incoming patch that is now done but wasn't before,
        // or that has newly-added assignees compared to the current state
        for (const sub of body.patch.subprojects) {
          for (const task of sub.tasks ?? []) {
            if (task.done && currentDoneMap.get(task.id) === false) {
              newlyCompletedTasks.push({ id: task.id, text: task.text });
            }
            const prevNames = new Set((currentPeopleMap.get(task.id) ?? []).map((n) => n.toLowerCase()));
            const newAssigneeNames = ((task.people ?? []) as { name: string }[])
              .map((p) => p.name)
              .filter((name) => !prevNames.has(name.toLowerCase()));
            if (newAssigneeNames.length > 0) {
              newlyAssignedTasks.push({ id: task.id, text: task.text, newAssigneeNames });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to detect task notification changes:', error);
      throw error;
    }
  }

  const updated = await updateProject(ownerUserId, body.id, body.patch);
  if (!updated) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Await delivery before responding so serverless runtimes cannot cut it off.
  if (newlyCompletedTasks.length > 0) {
    const memberIds = (updated.members ?? []).map((m) => m.userId).filter(Boolean);
    const projectTitle = updated.text;
    const completedByName = session.userName ?? session.userEmail ?? session.userId;
    const results = await Promise.allSettled(
      newlyCompletedTasks.map((task) =>
        notifyTaskCompleted({
          projectId: body.id!,
          projectTitle,
          taskId: task.id,
          taskTitle: task.text,
          completedByUserId: session.userId,
          completedByName,
          memberIds,
        }),
      ),
    );
    for (const result of results) {
      if (result.status === 'rejected') console.error('Task completion notification failed:', result.reason);
    }
  }

  // Task assignments use the same request-lifetime guarantee.
  if (newlyAssignedTasks.length > 0) {
    const members = updated.members ?? [];
    const projectTitle = updated.text;
    const assignedByName = session.userName ?? session.userEmail ?? session.userId;
    const results = await Promise.allSettled(
      newlyAssignedTasks.map((task) => {
        const nameSet = new Set(task.newAssigneeNames.map((n) => n.toLowerCase()));
        const assigneeIds = members
          .filter((m) => m.userId && nameSet.has(m.name.toLowerCase()))
          .map((m) => m.userId);
        if (assigneeIds.length === 0) return Promise.resolve();
        return notifyTaskAssigned({
          projectId: body.id!,
          projectTitle,
          taskId: task.id,
          taskTitle: task.text,
          assignedByUserId: session.userId,
          assignedByName,
          assigneeIds,
        });
      }),
    );
    for (const result of results) {
      if (result.status === 'rejected') console.error('Task assignment notification failed:', result.reason);
    }
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
