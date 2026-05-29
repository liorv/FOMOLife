import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { listThreadComments, addThreadComment } from '@/lib/projects/server/projectCommentsStore';
import { listProjects } from '@/lib/projects/server/projectsStore';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get('threadId');
  if (!threadId) return NextResponse.json({ error: 'threadId is required' }, { status: 400 });

  const comments = await listThreadComments(threadId);
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const body = (await request.json()) as {
    threadId?: string;
    threadTitle?: string;
    projectId?: string;
    taskId?: string;
    text?: string;
    avatarUrl?: string;
  };

  const { threadId, threadTitle, projectId, text } = body;
  if (!threadId || !threadTitle || !projectId || !text?.trim()) {
    return NextResponse.json({ error: 'threadId, threadTitle, projectId, text are required' }, { status: 400 });
  }

  // Collect the correct set of user IDs to notify:
  // - Task threads → only notify members assigned to that task (by name match)
  // - Project threads → notify all project members
  let memberIds: string[] = [];
  try {
    const projects = await listProjects(session.userId);
    const project = projects.find((p) => p.id === projectId);
    const allMembers = (project?.members ?? []).filter((m) => m.userId);

    if (body.taskId) {
      // Find the task in any subproject and get its assignee names
      const allTasks = (project?.subprojects ?? []).flatMap((sp) => sp.tasks ?? []);
      const task = allTasks.find((t) => t.id === body.taskId);
      const assigneeNames = new Set((task?.people ?? []).map((p) => p.name.toLowerCase()));
      // Match against project members by display name
      memberIds = allMembers
        .filter((m) => assigneeNames.has(m.name.toLowerCase()))
        .map((m) => m.userId);
      // Always include the project owner / current user's connections too
      // (fall back to full member list if no assignees are set)
      if (memberIds.length === 0) memberIds = allMembers.map((m) => m.userId);
    } else {
      memberIds = allMembers.map((m) => m.userId);
    }
  } catch { /* non-critical */ }

  const comment = await addThreadComment({
    threadId,
    threadTitle,
    projectId,
    ...(body.taskId ? { taskId: body.taskId } : {}),
    memberIds,
    authorId: session.userId,
    authorName: session.userName ?? session.userEmail ?? session.userId,
    text: text.trim(),
    ...(body.avatarUrl?.trim() ? { authorAvatarUrl: body.avatarUrl.trim() } : {}),
  });

  return NextResponse.json({ comment });
}
