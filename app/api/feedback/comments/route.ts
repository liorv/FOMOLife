import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { addComment, listComments } from '@/lib/feedback/server/feedbackStore';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const { searchParams } = new URL(request.url);
  const feedbackId = searchParams.get('feedbackId');
  if (!feedbackId) {
    return NextResponse.json({ error: 'feedbackId is required' }, { status: 400 });
  }

  const comments = await listComments(feedbackId);
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const body = (await request.json()) as { feedbackId?: string; text?: string };
  if (!body.feedbackId?.trim()) {
    return NextResponse.json({ error: 'feedbackId is required' }, { status: 400 });
  }
  const text = body.text?.trim() ?? '';
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 });
  }

  const result = await addComment(
    body.feedbackId,
    session.userId,
    session.userName ?? session.userEmail ?? session.userId,
    text,
  );

  if (!result) {
    return NextResponse.json({ error: 'Feedback item not found' }, { status: 404 });
  }

  return NextResponse.json(result.comment, { status: 201 });
}
