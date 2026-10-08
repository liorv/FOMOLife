jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({ load: jest.fn().mockResolvedValue(null), save: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('@/lib/server/frameworkAuth', () => ({
  getDisplayNameFromUserId: (id: string) => id,
  getFrameworkSession: jest.fn().mockResolvedValue({ isAuthenticated: true, userId: 'owner', userName: 'Owner' }),
}));
jest.mock('@/lib/server/webPush', () => ({ sendPushToUser: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }) }));
jest.mock('@/lib/projects/server/projectsStore', () => ({
  resolveProjectOwner: jest.fn().mockResolvedValue('owner'),
  listProjects: jest.fn(),
  updateProject: jest.fn(),
}));

import { notifyTaskCompleted } from '@/lib/projects/server/projectCommentsStore';
import { sendPushToUser } from '@/lib/server/webPush';
import { listProjects, updateProject } from '@/lib/projects/server/projectsStore';
import { PATCH } from '@/app/api/projects/route';

describe('shared task completion delivery', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('notifies all members and the completer, without duplicate recipients', async () => {
    await notifyTaskCompleted({
      projectId: 'project', projectTitle: 'Project', taskId: 'task', taskTitle: 'Task',
      completedByUserId: 'owner', completedByName: 'Owner', memberIds: ['owner', 'member', 'member'],
    });
    expect(jest.mocked(sendPushToUser).mock.calls.map(([userId]) => userId).sort()).toEqual(['member', 'owner']);
  });

  it('keeps the PATCH request alive until completion delivery finishes', async () => {
    const task = {
      id: 'task', text: 'Task', done: false, dueDate: null, favorite: false, people: [],
    };
    const subproject = { id: 'sub', text: 'Sub', tasks: [task] };
    const subprojects = [subproject];
    const project = { id: 'project', text: 'Project', color: 'blue', members: [{ userId: 'owner', name: 'Owner' }], subprojects };
    jest.mocked(listProjects).mockResolvedValue([project]);
    const updated = { ...project, subprojects: [{ ...subproject, tasks: [{ ...task, done: true }] }] };
    jest.mocked(updateProject).mockResolvedValue(updated);
    let release!: () => void;
    let started!: () => void;
    const sending = new Promise<void>((resolve) => { started = resolve; });
    jest.mocked(sendPushToUser).mockImplementationOnce(async () => {
      started();
      await new Promise<void>((resolve) => { release = resolve; });
      return { sent: 1, failed: 0 };
    });
    let responded = false;
    const response = PATCH(new Request('http://localhost/api/projects', {
      method: 'PATCH', body: JSON.stringify({ id: 'project', patch: { subprojects: updated.subprojects } }),
    })).then((result) => { responded = true; return result; });
    await sending;
    expect(responded).toBe(false);
    release();
    expect((await response).status).toBe(200);
    expect(responded).toBe(true);
  });
});
