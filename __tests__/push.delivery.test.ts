jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: () => mockLoad(),
    save: (key: string, data: PersistedUserData) => mockSave(key, data),
  }),
}));
jest.mock('web-push', () => ({
  __esModule: true, default: { setVapidDetails: jest.fn(), sendNotification: jest.fn() },
}));
jest.mock('@/lib/server/frameworkAuth', () => ({
  getFrameworkSession: jest.fn().mockResolvedValue({ isAuthenticated: true, userId: 'owner' }),
}));

import type { PersistedUserData } from '@myorg/storage';
import webpush from 'web-push';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { getPushPublicKey, sendPushToUser } from '@/lib/server/webPush';
import { POST } from '@/app/api/push/test/route';
import { GET } from '@/app/api/push/subscribe/route';

const mockLoad = jest.fn();
const mockSave = jest.fn();
const devices = [
  { endpoint: 'https://push.example/browser', keys: { auth: 'auth', p256dh: 'key' } },
  { endpoint: 'https://push.example/mobile', keys: { auth: 'auth', p256dh: 'key' } },
];
const originalPublicKey = process.env.VAPID_PUBLIC_KEY;
const originalPrivateKey = process.env.VAPID_PRIVATE_KEY;

describe('push delivery and diagnostics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    mockLoad.mockResolvedValue({ subscriptions: devices });
    mockSave.mockResolvedValue(undefined);
    jest.mocked(webpush.sendNotification).mockResolvedValue({ statusCode: 201, body: '', headers: {} });
  });
  afterAll(() => {
    if (originalPublicKey === undefined) delete process.env.VAPID_PUBLIC_KEY;
    else process.env.VAPID_PUBLIC_KEY = originalPublicKey;
    if (originalPrivateKey === undefined) delete process.env.VAPID_PRIVATE_KEY;
    else process.env.VAPID_PRIVATE_KEY = originalPrivateKey;
  });

  it('reports missing configuration instead of claiming a test was sent', async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(getPushPublicKey()).toBeNull();
    expect((await GET()).status).toBe(503);
    expect((await POST()).status).toBe(503);
    log.mockRestore();
  });

  it('sends to every subscribed device', async () => {
    expect(await sendPushToUser('owner', { title: 'Due tomorrow', body: 'Task' })).toEqual({ sent: 2, failed: 0 });
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    expect(jest.mocked(webpush.sendNotification).mock.calls.map(([sub]) => sub.endpoint)).toEqual(devices.map((sub) => sub.endpoint));
    for (const [, payload] of jest.mocked(webpush.sendNotification).mock.calls) {
      expect(JSON.parse(String(payload))).toEqual({ title: 'Due tomorrow', body: 'Task', url: '/' });
    }
  });

  it('links a test notification to Home, never the analytics dashboard', async () => {
    expect((await POST()).status).toBe(200);
    for (const [, payload] of jest.mocked(webpush.sendNotification).mock.calls) {
      expect(JSON.parse(String(payload))).toEqual(expect.objectContaining({ url: '/', tag: 'push-test' }));
    }
  });

  it('preserves the exact destination of a contextual notification', async () => {
    const url = '/?tab=projects&projectId=project&threadId=task%3Aproject%3Atask';
    await sendPushToUser('owner', { title: 'Reply', body: 'Message', url });
    for (const [, payload] of jest.mocked(webpush.sendNotification).mock.calls) {
      expect(JSON.parse(String(payload)).url).toBe(url);
    }
  });

  it('prunes expired subscriptions while still delivering to healthy devices', async () => {
    jest.mocked(webpush.sendNotification).mockRejectedValueOnce({ statusCode: 410 });
    expect(await sendPushToUser('owner', { title: 'Completed', body: 'Task' })).toEqual({ sent: 1, failed: 1 });
    expect(mockSave).toHaveBeenCalledWith('__push_subs__owner', { subscriptions: [devices[1]] });
  });

  it('reports a test failure when there are no registered devices', async () => {
    mockLoad.mockResolvedValue(null);
    expect((await POST()).status).toBe(409);
  });

  it('reports a test failure when every push service rejects delivery', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(webpush.sendNotification).mockRejectedValue(new Error('Push unavailable'));
    expect((await POST()).status).toBe(409);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('surfaces subscription storage failures', async () => {
    mockLoad.mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(sendPushToUser('owner', { title: 'Test', body: '' })).rejects.toThrow('Storage unavailable');
  });

  it('returns the public key without exposing the private key', async () => {
    expect(await (await GET()).json()).toEqual({ publicKey: 'test-public-key' });
  });

  it('requires authentication for device setup', async () => {
    jest.mocked(getFrameworkSession).mockResolvedValueOnce({
      isAuthenticated: false, userId: '', authMode: 'supabase-google',
    });
    expect((await GET()).status).toBe(401);
  });
});
