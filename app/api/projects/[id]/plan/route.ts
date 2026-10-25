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
  if (!body || typeof body !== 'object' || !('action' in body)) {
    return NextResponse.json({ error: 'A plan action and link are required' }, { status: 400 });
  }
  const parsed = body.action === 'add-many'
    ? parsePlanLinks('links' in body ? body.links : null)
    : parsePlanLinks('link' in body ? [body.link] : null);
  if (!parsed?.length || (body.action !== 'add' && body.action !== 'remove' && body.action !== 'add-many')) {
    return NextResponse.json({ error: 'Invalid plan action or link' }, { status: 400 });
  }
  const current = project.planningLinks ?? [];
  const keys = new Set(parsed.map(linkKey));
  const additions = new Map(parsed.map(link => [linkKey(link), link]));
  current.forEach(link => additions.delete(linkKey(link)));
  const links = body.action === 'remove'
    ? current.filter(item => !keys.has(linkKey(item)))
    : [...current, ...additions.values()];
  // Removing a stale link must remain possible after tasks are deleted or changed elsewhere.
  const error = body.action !== 'remove' ? validatePlanLinks(getPlanNodes(project), links) : null;
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
