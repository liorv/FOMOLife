import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { updateProject, deleteProject, listProjects, resolveProjectOwner, addSharedProjectRef, removeSharedProjectRef, getOrInitUserProjects } from '@/lib/projects/server/projectsStore';
import type { ProjectMember } from '@/lib/projects/server/projectsStore';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

type RouteCtx = { params: { id: string } | Promise<{ id: string }> };

/** POST /api/projects/[id]/members  — add a member (any member can invite) */
export async function POST(request: Request, ctx: RouteCtx) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const { id } = await ctx.params;
  const body = (await request.json()) as Partial<ProjectMember>;
  if (!body.userId || !body.name) {
    return NextResponse.json({ error: 'userId and name are required' }, { status: 400 });
  }

  const projects = await listProjects(session.userId);
  const project = projects.find((p) => p.id === id);
  // listProjects returns only own projects + explicitly shared ones, so finding
  // it here is sufficient proof of access — no separate isMember/isCreator check needed.
  if (!project) return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });

  const existingMembers = project.members ?? [];
  if (existingMembers.some((m) => m.userId === body.userId)) {
    return NextResponse.json({ error: 'Already a member' }, { status: 409 });
  }

  // Retroactively add the inviter if they're not yet in the members array
  // (handles projects created before explicit membership was introduced)
  const inviterAlreadyMember = existingMembers.some((m) => m.userId === session.userId);
  const inviterEntry: ProjectMember | null = inviterAlreadyMember ? null : {
    userId: session.userId,
    name: session.userName || session.userId,
    ...(session.userAvatarUrl ? { avatarUrl: session.userAvatarUrl } : {}),
  };

  const newMember: ProjectMember = {
    userId: body.userId,
    name: body.name,
    ...(body.avatarUrl ? { avatarUrl: body.avatarUrl } : {}),
  };

  const ownerUserId = await resolveProjectOwner(id, session.userId);
  const updatedMembers = [
    ...(inviterEntry ? [inviterEntry] : []),
    ...existingMembers,
    newMember,
  ];
  const updated = await updateProject(ownerUserId, id, { members: updatedMembers });
  if (!updated) {
    return NextResponse.json({ error: 'Failed to update project — could not resolve storage owner' }, { status: 500 });
  }

  // Give the new member a reference so listProjects returns this project for them
  await addSharedProjectRef(newMember.userId, { ownerUserId, projectId: id });

  return NextResponse.json(updated, { status: 201 });
}

/** DELETE /api/projects/[id]/members  — a member can only remove themselves (leave) */
export async function DELETE(request: Request, ctx: RouteCtx) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const { id } = await ctx.params;
  const body = (await request.json()) as { userId?: string };
  if (!body.userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // Members can only remove themselves
  if (body.userId !== session.userId) {
    return NextResponse.json({ error: 'You can only remove yourself from a project' }, { status: 403 });
  }

  const ownerUserId = await resolveProjectOwner(id, session.userId);
  
  // Get the project directly from the owner's storage
  const ownerProjects = await getOrInitUserProjects(ownerUserId);
  const project = ownerProjects.find((p) => p.id === id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Check if the user is actually a member
  const isMember = (project.members ?? []).some((m) => m.userId === body.userId);
  if (!isMember) {
    return NextResponse.json({ error: 'You are not a member of this project' }, { status: 400 });
  }

  const remainingMembers = (project.members ?? []).filter((m) => m.userId !== body.userId);

  // Remove the shared project reference for the leaving member (if it's a shared project)
  if (ownerUserId !== session.userId) {
    await removeSharedProjectRef(body.userId, id);
  }

  // If this was the last member, delete the project entirely
  if (remainingMembers.length === 0) {
    const deleted = await deleteProject(ownerUserId, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
    return NextResponse.json({ deleted: true });
  }

  const updated = await updateProject(ownerUserId, id, { members: remainingMembers });
  if (!updated) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
  return NextResponse.json(updated);
}
