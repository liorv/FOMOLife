import { NextResponse } from 'next/server';

import { unauthorizedResponse } from '@/lib/server/apiUtils';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import {
  addSharedProjectRef,
  listProjects,
  promoteSubproject,
  resolveProjectOwner,
} from '@/lib/projects/server/projectsStore';

type RouteCtx = {
  params:
    | { id: string; subprojectId: string }
    | Promise<{ id: string; subprojectId: string }>;
};

export async function POST(_request: Request, ctx: RouteCtx) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();

  const { id, subprojectId } = await ctx.params;
  const visibleProjects = await listProjects(session.userId);
  if (!visibleProjects.some((project) => project.id === id)) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
  }

  const ownerUserId = await resolveProjectOwner(id, session.userId);
  const result = await promoteSubproject(ownerUserId, id, subprojectId);
  if (!result) {
    return NextResponse.json({ error: 'Subproject not found' }, { status: 404 });
  }

  await Promise.all(
    (result.project.members ?? [])
      .filter((member) => member.userId && member.userId !== ownerUserId)
      .map((member) =>
        addSharedProjectRef(member.userId, {
          ownerUserId,
          projectId: result.project.id,
        }),
      ),
  );

  return NextResponse.json(result, { status: 201 });
}
