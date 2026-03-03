/// <reference types="jest" />
// tests for framework auth endpoints (login + logout).  Mocks simulate
// environment and Supabase to avoid external calls.

jest.mock('@/lib/frameworkEnv.server', () => ({
  getFrameworkServerEnv: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import type { NextResponse } from 'next/server';

// helper to build a request with optional json flag
function makeRequest(body?: any, json = true) {
  const init: RequestInit = {
    method: 'POST',
    headers: {},
    body: body != null ? JSON.stringify(body) : null,
  } as RequestInit;
  if (json) {
    init.headers = { 'content-type': 'application/json' };
  }
  return new Request('http://localhost/api/auth/login', init);
}

describe('framework auth routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('login handler', () => {
    it('returns ok when authMode=none (json)', async () => {
      (require('@/lib/frameworkEnv.server').getFrameworkServerEnv as jest.Mock).mockReturnValue({ authMode: 'none' });
      const { POST } = require('@/app/api/auth/login/route');
      const res: NextResponse = await POST(makeRequest({}, true));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.authMode).toBe('none');
    });

    it('redirects when authMode=none and not json', async () => {
      (require('@/lib/frameworkEnv.server').getFrameworkServerEnv as jest.Mock).mockReturnValue({ authMode: 'none' });
      const req = makeRequest(undefined, false);
      const { POST } = require('@/app/api/auth/login/route');
      const res: NextResponse = await POST(req);
      expect(res.status).toBe(302);
    });

    it('requires accessToken for supabase-google', async () => {
      (require('@/lib/frameworkEnv.server').getFrameworkServerEnv as jest.Mock).mockReturnValue({ authMode: 'supabase-google', supabaseUrl: 'u', supabaseAnonKey: 'k' });
      const { POST } = require('@/app/api/auth/login/route');
      const res: NextResponse = await POST(makeRequest({}, true));
      expect(res.status).toBe(400);
    });

    it('handles invalid supabase session', async () => {
      (require('@/lib/frameworkEnv.server').getFrameworkServerEnv as jest.Mock).mockReturnValue({ authMode: 'supabase-google', supabaseUrl: 'u', supabaseAnonKey: 'k' });
      const sup = require('@supabase/supabase-js');
      const fake = { auth: { getUser: jest.fn().mockResolvedValue({ data: {}, error: {} }) } };
      (sup.createClient as jest.Mock).mockReturnValue(fake);
      const { POST } = require('@/app/api/auth/login/route');
      const res: NextResponse = await POST(makeRequest({ accessToken: 'tok' }, true));
      expect(res.status).toBe(401);
    });

    it('successful supabase-google login sets cookies', async () => {
      (require('@/lib/frameworkEnv.server').getFrameworkServerEnv as jest.Mock).mockReturnValue({ authMode: 'supabase-google', supabaseUrl: 'u', supabaseAnonKey: 'k' });
      const sup = require('@supabase/supabase-js');
      const fake = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'e', user_metadata: {} } }, error: null }) } };
      (sup.createClient as jest.Mock).mockReturnValue(fake);
      const { POST } = require('@/app/api/auth/login/route');
      const res: NextResponse = await POST(makeRequest({ accessToken: 'tok', returnTo: '/foo' }, true));
      expect(res.status).toBe(200);
      expect(res.headers.get('set-cookie')).toMatch(/framework_session_user_id=u1/);
    });

    it('normal login sets framework_session cookie', async () => {
      (require('@/lib/frameworkEnv.server').getFrameworkServerEnv as jest.Mock).mockReturnValue({ authMode: 'plain' });
      const { POST } = require('@/app/api/auth/login/route');
      const res: NextResponse = await POST(makeRequest({ userId: 'bob', returnTo: '/x' }, true));
      expect(res.status).toBe(200);
      expect(res.headers.get('set-cookie')).toMatch(/framework_session=bob/);
    });
  });

  describe('logout handler', () => {
    it('json request clears cookies', async () => {
      const { POST } = require('@/app/api/auth/logout/route');
      const req = new Request('http://localhost/api/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json' } });
      const res: NextResponse = await POST(req);
      expect(res.status).toBe(200);
      const header = res.headers.get('set-cookie') || '';
      expect(header).toMatch(/framework_session=;/);
    });

    it('non-json redirect clears cookies', async () => {
      const { POST } = require('@/app/api/auth/logout/route');
      const req = new Request('http://localhost/api/auth/logout', { method: 'POST' });
      const res: NextResponse = await POST(req);
      expect(res.status).toBe(302);
    });
  });
});
