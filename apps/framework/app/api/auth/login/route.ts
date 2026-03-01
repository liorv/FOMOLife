import { NextResponse } from 'next/server';
import { getFrameworkServerEnv } from '@/lib/frameworkEnv.server';

function sanitizeUserId(rawValue: unknown): string {
  if (typeof rawValue !== 'string') return '';
  return rawValue.trim().slice(0, 120);
}

function isJsonRequest(request: Request): boolean {
  return request.headers.get('content-type')?.includes('application/json') ?? false;
}

export async function POST(request: Request) {
  const env = getFrameworkServerEnv();
  if (env.authMode === 'none') {
    if (isJsonRequest(request)) {
      return NextResponse.json({ ok: true, authMode: env.authMode });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  const jsonMode = isJsonRequest(request);
  let userId = '';
  let returnTo = '/';

  if (jsonMode) {
    const body = (await request.json().catch(() => ({}))) as { userId?: string; returnTo?: string };
    userId = sanitizeUserId(body.userId);
    returnTo = typeof body.returnTo === 'string' && body.returnTo.startsWith('/') ? body.returnTo : '/';
  } else {
    const form = await request.formData();
    userId = sanitizeUserId(form.get('userId'));
    const rawReturnTo = form.get('returnTo');
    if (typeof rawReturnTo === 'string' && rawReturnTo.startsWith('/')) {
      returnTo = rawReturnTo;
    }
  }

  if (!userId) {
    if (jsonMode) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    const failUrl = new URL('/login', request.url);
    failUrl.searchParams.set('error', 'missing-user');
    return NextResponse.redirect(failUrl);
  }

  if (jsonMode) {
    const response = NextResponse.json({ ok: true, userId, returnTo });
    response.cookies.set('framework_session', userId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set('framework_session', userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}