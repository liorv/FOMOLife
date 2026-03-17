import { jest } from '@jest/globals';

// Test framework login behavior in JSON mode by mocking the env getter
jest.mock('@/lib/frameworkEnv.server', () => ({
  getFrameworkServerEnv: () => ({ authMode: 'none' }),
}));

// Import route handlers
const login = require('../../app/api/auth/login/route');

function makeRequest(body?: any, opts?: { url?: string; headers?: Record<string, string> }) {
  return {
    url: opts?.url || 'http://localhost/api/auth/login',
    headers: { get: (name: string) => (opts?.headers?.[name.toLowerCase()] ?? (body ? 'application/json' : null)) },
    async json() { return body; },
  } as unknown as Request;
}

describe('framework integration', () => {
  it('POST login JSON returns ok when authMode=none', async () => {
    const res = await login.POST(makeRequest({ userId: 'u1' }, { headers: { 'content-type': 'application/json' } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('ok', true);
    expect(body).toHaveProperty('authMode', 'none');
  });
});
