import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { sendPushToUser } from '@/lib/server/webPush';

/** POST /api/push/test — sends a test push notification to the current user's subscribed devices. */
export async function POST() {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendPushToUser(session.userId, {
      title: 'FOMO Life',
      body: 'Test push notification 🎉',
      url: '/dashboard',
      tag: 'push-test',
    });

    if (result.sent === 0) {
      return NextResponse.json({ error: 'No push could be sent. Enable notifications on this device and try again.' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[push/test] error:', error);
    return NextResponse.json({ error: 'Could not send the test notification. Check the server push configuration.' }, { status: 503 });
  }
}
