import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { unauthorizedResponse } from '@/lib/server/apiUtils';
import { listProjects, resolveProjectOwner, updateProject } from '@/lib/projects/server/projectsStore';
import { getPlanNodes, linkKey, parsePlanLinks, validatePlanLinks } from '@/lib/projects/planning';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorizedResponse();
  const { id } = await context.params;
  const project = (await listProjects(session.userId)).find(item =>
    item.id === id && (!item.members?.length || item.members.some(member => member.userId === session.userId)),
  );
  if (!project) return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || !('action' in body) || !('link' in body)) {
    return NextResponse.json({ error: 'A plan action and link are required' }, { status: 400 });
  }
  const parsed = parsePlanLinks([body.link]);
  const link = parsed?.[0];
  if (!link || (body.action !== 'add' && body.action !== 'remove')) {
    return NextResponse.json({ error: 'Invalid plan action or link' }, { status: 400 });
  }
  const current = project.planningLinks ?? [];
  const links = body.action === 'remove'
    ? current.filter(item => linkKey(item) !== linkKey(link))
    : current.some(item => linkKey(item) === linkKey(link)) ? current : [...current, link];
  // Removing a stale link must remain possible after tasks are deleted or changed elsewhere.
  const error = body.action === 'add' ? validatePlanLinks(getPlanNodes(project), links) : null;
  if (error) return NextResponse.json({ error }, { status: 400 });
  const owner = await resolveProjectOwner(id, session.userId);
  try {
    const updated = await updateProject(owner, id, { planningLinks: links });
    if (!updated) return NextResponse.json({ error: 'Project no longer exists' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to save project plan:', error);
    return NextResponse.json({ error: 'Unable to save the project plan. Please retry.' }, { status: 500 });
  }
}
