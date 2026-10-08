import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

const workerSource = readFileSync(join(__dirname, '..', 'public', 'sw.js'), 'utf8');
const origin = 'https://fomo.example';

function worker(existingClient: boolean) {
  const handlers = new Map<string, (event: unknown) => void>();
  const navigate = jest.fn().mockResolvedValue(undefined);
  const focus = jest.fn().mockResolvedValue(undefined);
  const openWindow = jest.fn().mockResolvedValue(undefined);
  const showNotification = jest.fn().mockResolvedValue(undefined);
  runInNewContext(workerSource, {
    URL,
    self: {
      location: { origin },
      addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler),
      registration: { showNotification },
      clients: {
        matchAll: async () => existingClient ? [{ url: `${origin}/?tab=feedback`, navigate, focus }] : [],
        openWindow,
      },
    },
  });
  return { handlers, navigate, focus, openWindow, showNotification };
}

describe('notification click destinations', () => {
  it.each([true, false])('uses the same destination with an existing client %s', async (existingClient) => {
    for (const [input, expected] of [
      [undefined, '/'],
      ['/', '/'],
      ['/dashboard', '/'],
      [`${origin}/dashboard`, '/'],
      ['/dashboard/?tab=projects&projectId=project&taskId=task', '/?tab=projects&projectId=project&taskId=task'],
      ['/?tab=feedback&feedbackId=feedback', '/?tab=feedback&feedbackId=feedback'],
      ['/?tab=projects&projectId=project&threadId=task%3Aproject%3Atask', '/?tab=projects&projectId=project&threadId=task%3Aproject%3Atask'],
    ]) {
      const instance = worker(existingClient);
      const close = jest.fn();
      const waitUntil = jest.fn();
      instance.handlers.get('notificationclick')!({
        notification: { close, data: { url: input } },
        waitUntil,
      });
      await waitUntil.mock.calls[0]![0];
      expect(close).toHaveBeenCalledTimes(1);
      if (existingClient) {
        expect(instance.navigate).toHaveBeenCalledWith(`${origin}${expected}`);
        expect(instance.focus).toHaveBeenCalledTimes(1);
        expect(instance.openWindow).not.toHaveBeenCalled();
      } else {
        expect(instance.openWindow).toHaveBeenCalledWith(`${origin}${expected}`);
      }
    }
  });

  it('stores a Home destination for a test notification carrying the old analytics URL', async () => {
    const instance = worker(false);
    const waitUntil = jest.fn();
    instance.handlers.get('push')!({
      data: { json: () => ({ title: 'Test', body: 'Test message', url: '/dashboard' }) },
      waitUntil,
    });
    await waitUntil.mock.calls[0]![0];
    expect(instance.showNotification).toHaveBeenCalledWith('Test', expect.objectContaining({
      data: { url: `${origin}/` },
    }));
  });
});
