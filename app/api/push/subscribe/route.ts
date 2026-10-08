import { NextResponse } from 'next/server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { addPushSubscription, removePushSubscription, getPushPublicKey } from '@/lib/server/webPush';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET() {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();
  const publicKey = getPushPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: 'Web push is not configured' }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}

export async function POST(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const body = await request.json().catch(() => null);
  const subscription = body?.subscription;
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys;
  if (typeof endpoint !== 'string' || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  await addPushSubscription(session.userId, {
    endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) return unauthorized();

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (typeof endpoint !== 'string') {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  await removePushSubscription(session.userId, endpoint);
  return NextResponse.json({ ok: true });
}
