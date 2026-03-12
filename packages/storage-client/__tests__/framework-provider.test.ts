import { createFrameworkStorageProvider } from '../src/framework-provider';

const FRAMEWORK_URL = 'http://localhost:3001';
const SERVICE_KEY = 'test-service-key-at-least-32-chars-long!!';

function mockFetch(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body,
  });
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('FrameworkStorageProvider — tasks domain', () => {
  const provider = createFrameworkStorageProvider({
    frameworkUrl: FRAMEWORK_URL,
    serviceKey: SERVICE_KEY,
    domain: 'tasks',
  });

  test('load sends correct URL and headers, returns normalised blob', async () => {
    const fetchMock = mockFetch(200, { data: [{ id: 't1', text: 'hello' }] });
    global.fetch = fetchMock as any;

    const result = await provider.load('user-1');

    expect(fetchMock).toHaveBeenCalledWith(
      `${FRAMEWORK_URL}/api/storage?domain=tasks`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-Internal-Service-Key': SERVICE_KEY,
          'X-User-Id': 'user-1',
        }),
      }),
    );
    expect(result).toEqual({ tasks: [{ id: 't1', text: 'hello' }] });
  });

  test('load returns null when gateway returns { data: null }', async () => {
    global.fetch = mockFetch(200, { data: null }) as any;
    const result = await provider.load('user-1');
    expect(result).toBeNull();
  });

  test('load throws on non-2xx status', async () => {
    global.fetch = mockFetch(503, {}) as any;
    await expect(provider.load('user-1')).rejects.toThrow('Storage gateway load failed: 503');
  });

  test('save sends correct URL, headers and body', async () => {
    const fetchMock = mockFetch(200, { ok: true });
    global.fetch = fetchMock as any;

    await provider.save('user-1', { tasks: [{ id: 't1' }] as any[], projects: [], people: [] });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FRAMEWORK_URL}/api/storage?domain=tasks`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Internal-Service-Key': SERVICE_KEY,
          'X-User-Id': 'user-1',
        }),
        body: JSON.stringify({ data: [{ id: 't1' }] }),
      }),
    );
  });

  test('save throws on non-2xx status', async () => {
    global.fetch = mockFetch(500, {}) as any;
    await expect(provider.save('user-1', {})).rejects.toThrow('Storage gateway save failed: 500');
  });
});

describe('FrameworkStorageProvider — people domain', () => {
  const provider = createFrameworkStorageProvider({
    frameworkUrl: FRAMEWORK_URL,
    serviceKey: SERVICE_KEY,
    domain: 'people',
  });

  test('load returns people and groups from slice', async () => {
    global.fetch = mockFetch(200, {
      data: { people: [{ id: 'c1' }], groups: [{ id: 'g1' }] },
    }) as any;

    const result = await provider.load('user-2');
    expect(result).toEqual({ people: [{ id: 'c1' }], groups: [{ id: 'g1' }] });
  });

  test('save sends people+groups as slice', async () => {
    const fetchMock = mockFetch(200, { ok: true });
    global.fetch = fetchMock as any;

    await provider.save('user-2', { people: [{ id: 'c1' }] as any[], groups: [{ id: 'g1' }] as any[] });

    const callBody = JSON.parse((fetchMock.mock.calls[0]?.[1] as any).body);
    expect(callBody).toEqual({ data: { people: [{ id: 'c1' }], groups: [{ id: 'g1' }] } });
  });
});

describe('FrameworkStorageProvider — projects domain', () => {
  const provider = createFrameworkStorageProvider({
    frameworkUrl: FRAMEWORK_URL,
    serviceKey: SERVICE_KEY,
    domain: 'projects',
  });

  test('load returns projects array', async () => {
    global.fetch = mockFetch(200, { data: [{ id: 'p1', text: 'My Project' }] }) as any;
    const result = await provider.load('user-3');
    expect(result).toEqual({ projects: [{ id: 'p1', text: 'My Project' }] });
  });
});
