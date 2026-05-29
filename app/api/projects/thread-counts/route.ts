import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { getProjectThreadCounts } from '@/lib/projects/server/projectCommentsStore';
import { listProjects } from '@/lib/projects/server/projectsStore';

export async function GET(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Verify user has access to this project
  const projects = await listProjects(session.userId);
  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Collect all task IDs across all subprojects
  const taskIds: string[] = [];
  for (const sub of project.subprojects ?? []) {
    for (const task of sub.tasks ?? []) {
      taskIds.push(task.id);
    }
  }

  const counts = await getProjectThreadCounts(projectId, taskIds);
  return NextResponse.json({ counts });
}
