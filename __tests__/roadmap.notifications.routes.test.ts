jest.mock('server-only', () => ({}));
jest.mock('@/lib/server/frameworkAuth', () => ({
  getFrameworkSession: jest.fn().mockResolvedValue({ isAuthenticated: true, userId: 'member' }),
}));
jest.mock('@/lib/projects/server/projectsStore', () => ({ listProjects: jest.fn().mockResolvedValue([]) }));
jest.mock('@/lib/projects/server/roadmapNotifications', () => ({ scanRoadmapNotifications: jest.fn().mockResolvedValue(0) }));
jest.mock('@/lib/projects/server/projectCommentsStore', () => ({
  listProjectNotifications: jest.fn().mockResolvedValue([]),
  markProjectNotificationsRead: jest.fn().mockResolvedValue(undefined),
  dismissProjectNotifications: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/tasks/server/taskNotificationsStore', () => ({
  runTaskDueNotificationsJob: jest.fn().mockResolvedValue({ usersScanned: 2, notified: 1 }),
}));
jest.mock('@/lib/tasks/server/allUsersData', () => ({
  listAllUsersData: jest.fn().mockResolvedValue([{ userId: 'owner', data: {} }, { userId: 'member', data: {} }]),
}));

import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import { listProjects } from '@/lib/projects/server/projectsStore';
import { scanRoadmapNotifications } from '@/lib/projects/server/roadmapNotifications';
import { dismissProjectNotifications, listProjectNotifications, markProjectNotificationsRead } from '@/lib/projects/server/projectCommentsStore';
import { GET, PATCH } from '@/app/api/projects/notifications/route';
import { GET as cronGET } from '@/app/api/tasks/cron/route';
import { runTaskDueNotificationsJob } from '@/lib/tasks/server/taskNotificationsStore';
import { listAllUsersData } from '@/lib/tasks/server/allUsersData';

const originalSecret = process.env.CRON_SECRET;

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.CRON_SECRET;
});
afterEach(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

it('scans only the signed-in user before returning the notification feed', async () => {
  const result = await GET(new Request('http://localhost/api/projects/notifications'));
  expect(result.status).toBe(200);
  expect(scanRoadmapNotifications).toHaveBeenCalledWith('member', []);
  expect(jest.mocked(scanRoadmapNotifications).mock.invocationCallOrder[0])
    .toBeLessThan(jest.mocked(listProjectNotifications).mock.invocationCallOrder[0]!);
  expect(await result.json()).toEqual({ notifications: [], unreadCount: 0 });
});

it('does not scan or expose notifications without authentication', async () => {
  jest.mocked(getFrameworkSession).mockResolvedValueOnce({ isAuthenticated: false, userId: '', authMode: 'mock-cookie' });
  expect((await GET(new Request('http://localhost/api/projects/notifications'))).status).toBe(401);
  expect(scanRoadmapNotifications).not.toHaveBeenCalled();
  expect(listProjects).not.toHaveBeenCalled();
});

it.each(['read', 'dismiss'] as const)('uses existing %s management for Roadmap notifications', async action => {
  const response = await PATCH(new Request('http://localhost/api/projects/notifications', {
    method: 'PATCH', body: JSON.stringify({ ids: ['roadmap:event'], action }),
  }));
  expect(response.status).toBe(200);
  expect(action === 'read' ? markProjectNotificationsRead : dismissProjectNotifications)
    .toHaveBeenCalledWith('member', ['roadmap:event']);
});

it('scans all real users on the existing daily cron, including those with no task reminders', async () => {
  jest.mocked(scanRoadmapNotifications).mockResolvedValueOnce(1).mockResolvedValueOnce(2);
  const response = await cronGET(new Request('http://localhost/api/tasks/cron'));
  expect(await response.json()).toEqual({ ok: true, usersScanned: 2, notified: 1, roadmapNotified: 3 });
  expect(scanRoadmapNotifications).toHaveBeenNthCalledWith(1, 'owner', []);
  expect(scanRoadmapNotifications).toHaveBeenNthCalledWith(2, 'member', []);
  expect(listAllUsersData).toHaveBeenCalledTimes(1);
});

it('preserves cron authentication and does no work for an invalid secret', async () => {
  process.env.CRON_SECRET = 'test-only-secret';
  expect((await cronGET(new Request('http://localhost/api/tasks/cron'))).status).toBe(401);
  expect(runTaskDueNotificationsJob).not.toHaveBeenCalled();
  expect(scanRoadmapNotifications).not.toHaveBeenCalled();
});

it('surfaces scheduled scan failures rather than reporting successful delivery', async () => {
  const error = new Error('Storage unavailable');
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    jest.mocked(scanRoadmapNotifications).mockRejectedValueOnce(error);
    const response = await cronGET(new Request('http://localhost/api/tasks/cron'));
    expect(response.status).toBe(500);
    expect(log).toHaveBeenCalledWith('[tasks/cron] error:', error);
  } finally {
    log.mockRestore();
  }
});
