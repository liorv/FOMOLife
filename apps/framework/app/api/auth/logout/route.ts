import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const isJson = request.headers.get('content-type')?.includes('application/json') ?? false;
  const response = isJson
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL('/login', request.url));

  response.cookies.set('framework_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}