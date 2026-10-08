import { ensurePushSubscription } from '@/lib/client/pushNotifications';

const mockSubscribe = jest.fn();
const mockGetSubscription = jest.fn();
const mockRegister = jest.fn();
const mockPermission = jest.fn();
const mockFetch = jest.fn();
const mockSubscription = {
  options: {},
  toJSON: () => ({ endpoint: 'https://push.example/device', keys: { auth: 'auth', p256dh: 'key' } }),
};

describe('device push setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(window, 'PushManager', { configurable: true, value: function PushManager() {} });
    Object.defineProperty(window, 'Notification', {
      configurable: true, value: { permission: 'granted', requestPermission: mockPermission },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true, value: {
        register: mockRegister.mockResolvedValue({}),
        ready: Promise.resolve({ pushManager: { getSubscription: mockGetSubscription, subscribe: mockSubscribe } }),
      },
    });
    mockGetSubscription.mockResolvedValue(null);
    mockSubscribe.mockResolvedValue(mockSubscription);
    mockPermission.mockResolvedValue('granted');
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ publicKey: 'AQID' }) });
    global.fetch = mockFetch;
  });

  it('never prompts automatically on page load', async () => {
    Object.defineProperty(Notification, 'permission', { value: 'default', configurable: true });
    expect(await ensurePushSubscription()).toBe('disabled');
    expect(mockPermission).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('requests permission synchronously from the enable action before any fetch', async () => {
    Object.defineProperty(Notification, 'permission', { value: 'default', configurable: true });
    const pending = ensurePushSubscription(true);
    expect(mockPermission).toHaveBeenCalledTimes(1);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(await pending).toBe('enabled');
    expect(mockRegister).toHaveBeenCalledWith('/sw.js');
    expect(mockFetch).toHaveBeenLastCalledWith('/api/push/subscribe', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ subscription: mockSubscription.toJSON() }),
    }));
  });

  it('re-registers existing subscriptions without asking for permission', async () => {
    mockGetSubscription.mockResolvedValue(mockSubscription);
    expect(await ensurePushSubscription()).toBe('enabled');
    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(mockPermission).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('replaces a subscription when its server key has changed', async () => {
    const unsubscribe = jest.fn().mockResolvedValue(true);
    mockGetSubscription.mockResolvedValue({
      ...mockSubscription, options: { applicationServerKey: new Uint8Array([4, 5, 6]).buffer }, unsubscribe,
    });
    await ensurePushSubscription();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('reports permission denial without subscribing', async () => {
    Object.defineProperty(Notification, 'permission', { value: 'denied', configurable: true });
    expect(await ensurePushSubscription(true)).toBe('blocked');
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('surfaces a failed registration save', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ publicKey: 'AQID' }) })
      .mockResolvedValueOnce({ ok: false });
    await expect(ensurePushSubscription()).rejects.toThrow('Could not save this device');
  });

  it('surfaces missing server configuration', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    await expect(ensurePushSubscription()).rejects.toThrow('not configured');
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('reports unsupported contexts', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    expect(await ensurePushSubscription(true)).toBe('unsupported');
  });
});
