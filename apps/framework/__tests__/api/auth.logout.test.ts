import { jest } from '@jest/globals';

const logout = require('../../app/api/auth/logout/route');

function makeRequest(body?: any, opts?: { url?: string; headers?: Record<string, string> }) {
  return {
    url: opts?.url || 'http://localhost/api/auth/logout',
    headers: { get: (name: string) => (opts?.headers?.[name.toLowerCase()] ?? (body ? 'application/json' : null)) },
    async json() { return body; },
  } as unknown as Request;
}

describe('framework auth logout', () => {
  it('POST with JSON returns ok', async () => {
    const res = await logout.POST(makeRequest({}, { headers: { 'content-type': 'application/json' } }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('ok', true);
  });

  it('POST non-JSON redirects to /login', async () => {
    const res = await logout.POST(makeRequest());
    // redirect response should be a 3xx status
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
  });
});
