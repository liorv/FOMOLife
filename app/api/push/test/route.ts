import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { sendPushToUser } from '@/lib/server/webPush';

/** POST /api/push/test — sends a test push notification to the current user's subscribed devices. */
export async function POST() {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await sendPushToUser(session.userId, {
    title: 'FOMO Life',
    body: 'Test push notification 🎉',
    url: '/dashboard',
    tag: 'push-test',
  });

  return NextResponse.json({ ok: true });
}
