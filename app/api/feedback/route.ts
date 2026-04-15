import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import {
  createFeedback,
  deleteFeedback,
  listFeedback,
  markFeedbackComplete,
  voteFeedback,
} from '@/lib/feedback/server/feedbackStore';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET() {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const feedback = await listFeedback();
  return NextResponse.json({ feedback });
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const body = (await request.json()) as {
    type?: string;
    title?: string;
    description?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (body.type !== 'feature' && body.type !== 'bug') {
    return NextResponse.json({ error: 'Type must be "feature" or "bug"' }, { status: 400 });
  }

  const created = await createFeedback(
    session.userId,
    session.userName ?? session.userEmail ?? session.userId,
    { type: body.type, title: body.title, description: body.description ?? '' },
  );
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const body = (await request.json()) as { id?: string; vote?: number; complete?: boolean };
  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  // Handle completion toggle
  if (body.complete !== undefined) {
    const result = await markFeedbackComplete(session.userId, body.id, body.complete);
    if (result.archived) {
      return NextResponse.json({ archived: true });
    }
    if (!result.item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(result.item);
  }

  // Handle vote
  if (body.vote !== 1 && body.vote !== -1 && body.vote !== 0) {
    return NextResponse.json({ error: 'vote must be 1, -1, or 0' }, { status: 400 });
  }

  const updated = await voteFeedback(session.userId, body.id, body.vote as 1 | -1 | 0);
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const removed = await deleteFeedback(session.userId, body.id);
  if (!removed) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
