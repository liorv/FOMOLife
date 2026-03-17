import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getFrameworkServerEnv } from '@/lib/frameworkEnv.server';

function sanitizeUserId(rawValue: unknown): string {
  if (typeof rawValue !== 'string') return '';
  return rawValue.trim().slice(0, 120);
}

function isJsonRequest(request: Request): boolean {
  return request.headers.get('content-type')?.includes('application/json') ?? false;
}

function sanitizeReturnTo(rawValue: unknown): string {
  if (typeof rawValue !== 'string') return '/';
  return rawValue.startsWith('/') ? rawValue : '/';
}

function sanitizeDisplayName(rawValue: unknown): string {
  if (typeof rawValue !== 'string') return '';
  return rawValue.trim().slice(0, 120);
}

function sanitizeAvatarUrl(rawValue: unknown): string {
  if (typeof rawValue !== 'string') return '';
  const normalized = rawValue.trim();
  if (!normalized) return '';
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized.slice(0, 500);
  }
  return '';
}

export async function POST(request: Request) {
  const env = getFrameworkServerEnv();
  if (env.authMode === 'none') {
    if (isJsonRequest(request)) {
      return NextResponse.json({ ok: true, authMode: env.authMode });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (env.authMode === 'supabase-google') {
    const jsonMode = isJsonRequest(request);
    if (!jsonMode) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const body = (await request.json().catch(() => ({}))) as {
      accessToken?: string;
      returnTo?: string;
    };

    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    const returnTo = sanitizeReturnTo(body.returnTo);

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    const supabase = createClient(env.supabaseUrl!, env.supabaseAnonKey!);
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid Supabase session' }, { status: 401 });
    }

    const user = data.user;
    const userId = sanitizeUserId(user.id);
    const userEmail = sanitizeUserId(user.email ?? user.id);
    const userName = sanitizeDisplayName(
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? '',
    );
    const userAvatarUrl = sanitizeAvatarUrl(user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? '');

    const response = NextResponse.json({ ok: true, returnTo, userId, userEmail, userName, userAvatarUrl });
    response.cookies.set('framework_session_user_id', userId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set('framework_session_user_email', userEmail, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set('framework_session_user_name', userName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set('framework_session_user_avatar', userAvatarUrl, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  const jsonMode = isJsonRequest(request);
  let userId = '';
  let returnTo = '/';

  if (jsonMode) {
    const body = (await request.json().catch(() => ({}))) as { userId?: string; returnTo?: string };
    userId = sanitizeUserId(body.userId);
    returnTo = sanitizeReturnTo(body.returnTo);
  } else {
    const form = await request.formData();
    userId = sanitizeUserId(form.get('userId'));
    const rawReturnTo = form.get('returnTo');
    returnTo = sanitizeReturnTo(rawReturnTo);
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