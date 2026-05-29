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

  // Collect project member IDs so we know who to notify
  let memberIds: string[] = [];
  try {
    const projects = await listProjects(session.userId);
    const project = projects.find((p) => p.id === projectId);
    memberIds = (project?.members ?? []).map((m) => m.userId).filter(Boolean);
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
