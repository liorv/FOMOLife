jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: (userId: string) => mockLoad(userId),
    save: (userId: string, data: unknown) => mockSave(userId, data),
  }),
}));
jest.mock('@/lib/server/webPush', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));

import { createTask, listTasks, updateTask } from '@/lib/tasks/server/tasksStore';
import { createProject, updateProject, listProjects } from '@/lib/projects/server/projectsStore';
import type { ProjectSubproject } from '@/lib/projects/server/projectsStore';
import { advanceRecurringTask } from '@/lib/tasks/recurrence';

const mockLoad = jest.fn();
const mockSave = jest.fn();
const createdAt = '2026-10-07T10:00:00.000Z';
const completedAt = '2026-10-07T11:00:00.000Z';
let userId: string;
let userCount = 0;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(createdAt));
  jest.clearAllMocks();
  mockLoad.mockResolvedValue(null);
  mockSave.mockResolvedValue(undefined);
  userId = `activity-user-${++userCount}`;
});

afterEach(() => jest.useRealTimers());

it('persists standalone creation and completion dates without refreshing completion on unrelated edits', async () => {
  const task = await createTask(userId, { text: 'Task', dueDate: '2027-01-01' });
  expect(task.createdAt).toBe(createdAt);
  jest.setSystemTime(new Date(completedAt));
  expect((await updateTask(userId, task.id, { done: true }))?.completedAt).toBe(completedAt);
  jest.setSystemTime(new Date('2026-10-07T12:00:00Z'));
  const edited = await updateTask(userId, task.id, { done: true, text: 'Edited' });
  expect(edited).toMatchObject({ createdAt, completedAt });
  expect(mockSave).toHaveBeenLastCalledWith(userId, expect.objectContaining({
    tasks: [expect.objectContaining({ createdAt, completedAt })],
  }));
  expect((await updateTask(userId, task.id, { done: false }))?.completedAt).toBeNull();
  expect((await updateTask(userId, task.id, { done: true }))?.completedAt).toBe('2026-10-07T12:00:00.000Z');
});

it('advances a recurring standalone task in place without retaining completed copies', async () => {
  const task = await createTask(userId, {
    text: 'Daily review', dueDate: '2026-10-07', recurrence: 'daily',
  });

  const updated = await updateTask(userId, task.id, { done: true });

  const tasks = await listTasks(userId);
  expect(tasks).toHaveLength(1);
  expect(updated).toMatchObject({
    id: task.id, text: 'Daily review', done: false, dueDate: '2026-10-08',
    recurrence: 'daily', completedAt: null,
  });
  expect(tasks[0]?.id).toBe(task.id);
  expect(mockSave).toHaveBeenLastCalledWith(userId, expect.objectContaining({
    tasks: [expect.objectContaining({ id: task.id, done: false, recurrence: 'daily' })],
  }));

  const second = await updateTask(userId, task.id, { done: true });
  expect(second).toMatchObject({ id: task.id, done: false, dueDate: '2026-10-09' });
  expect(mockSave).toHaveBeenLastCalledWith(userId, expect.objectContaining({
    tasks: [expect.objectContaining({ id: task.id, done: false, dueDate: '2026-10-09' })],
  }));
  expect(await listTasks(userId)).toHaveLength(1);
});

it('persists the next overdue occurrence relative to the last due date', async () => {
  const task = await createTask(userId, {
    text: 'Overdue daily review', dueDate: '2026-10-01', recurrence: 'daily',
    recurrenceAnchorDate: '2026-09-01',
  });
  expect(await updateTask(userId, task.id, { done: true })).toMatchObject({
    id: task.id, done: false, dueDate: '2026-10-02',
  });
  expect(mockSave).toHaveBeenLastCalledWith(userId, expect.objectContaining({
    tasks: [expect.objectContaining({ id: task.id, dueDate: '2026-10-02' })],
  }));
});

it('reloads a recurring project task from persisted storage after the server store restarts', async () => {
  let persisted: unknown = null;
  mockLoad.mockImplementation(async () => persisted === null ? null : JSON.parse(JSON.stringify(persisted)));
  mockSave.mockImplementation(async (_userId: string, data: unknown) => {
    persisted = JSON.parse(JSON.stringify(data));
  });
  const recurring = {
    id: 'repeat', text: 'Weekly review', done: false, dueDate: '2026-10-07',
    recurrence: 'weekly' as const, favorite: false, people: [],
  };
  let projectId = '';
  await jest.isolateModulesAsync(async () => {
    const store = await import('@/lib/projects/server/projectsStore');
    const created = await store.createProject(userId, {
      text: 'Recurring project',
      subprojects: [{
        id: 'project-tasks', text: 'Project Tasks', isProjectLevel: true,
        tasks: [recurring],
      }],
    });
    projectId = created.id;
    const advanced = advanceRecurringTask(recurring)!;
    await store.updateProject(userId, projectId, {
      subprojects: created.subprojects.map(sub => ({
        ...sub, tasks: sub.tasks.map(task => task.id === recurring.id ? advanced : task),
      })),
    });
  });
  await jest.isolateModulesAsync(async () => {
    const store = await import('@/lib/projects/server/projectsStore');
    const reloaded = (await store.listProjects(userId)).find(project => project.id === projectId);
    expect(reloaded?.subprojects.flatMap(sub => sub.tasks)).toEqual([
      expect.objectContaining({
        id: recurring.id, done: false, dueDate: '2026-10-14',
        recurrence: 'weekly', recurrenceAnchorDate: '2026-10-07', completedAt: null,
      }),
    ]);
  });
});

it('timestamps project task creation and transitions across full-project saves', async () => {
  const subprojects: ProjectSubproject[] = [{
    id: 'sub', text: 'Subproject',
    tasks: [{ id: 'task', text: 'Task', done: false, dueDate: '2027-01-01', favorite: false, people: [] }],
  }];
  const project = await createProject(userId, { text: 'Project', subprojects });
  expect(project.createdAt).toBe(createdAt);
  const findTask = (subprojects: ProjectSubproject[]) => subprojects.flatMap(sub => sub.tasks)[0]!;
  expect(findTask(project.subprojects)).toMatchObject({ createdAt, completedAt: null });

  jest.setSystemTime(new Date(completedAt));
  // Older clients may send the task without either timestamp.
  subprojects[0]!.tasks[0]!.done = true;
  const completed = await updateProject(userId, project.id, { subprojects });
  expect(findTask(completed!.subprojects)).toMatchObject({ createdAt, completedAt });
  jest.setSystemTime(new Date('2026-10-07T12:00:00Z'));
  const edited = await updateProject(userId, project.id, { subprojects });
  expect(edited?.createdAt).toBe(createdAt);
  expect(findTask(edited!.subprojects)).toMatchObject({ createdAt, completedAt });
  expect(mockSave).toHaveBeenLastCalledWith(userId, expect.objectContaining({
    projects: [expect.objectContaining({ subprojects: edited!.subprojects })],
  }));
  subprojects[0]!.tasks[0]!.done = false;
  const reopened = await updateProject(userId, project.id, { subprojects });
  expect(findTask(reopened!.subprojects).completedAt).toBeNull();
  subprojects[0]!.tasks[0]!.done = true;
  const recompleted = await updateProject(userId, project.id, { subprojects });
  expect(findTask(recompleted!.subprojects).completedAt).toBe('2026-10-07T12:00:00.000Z');

  subprojects[0]!.tasks.push({
    id: 'new-task', text: 'New task', done: false, dueDate: null, favorite: false, people: [],
  });
  const added = await updateProject(userId, project.id, { subprojects });
  expect(added!.subprojects.flatMap(sub => sub.tasks).find(task => task.id === 'new-task')).toMatchObject({
    createdAt: '2026-10-07T12:00:00.000Z', completedAt: null,
  });
});

it('does not invent timestamps for existing legacy project tasks during edits', async () => {
  const subprojects: ProjectSubproject[] = [{
    id: 'sub', text: 'Legacy',
    tasks: [{ id: 'task', text: 'Old task', done: true, dueDate: '2027-01-01', favorite: false, people: [] }],
  }];
  mockLoad.mockResolvedValue({ projects: [{ id: 'legacy', text: 'Legacy', color: 'blue', subprojects }] });
  await listProjects(userId);
  const saved = await updateProject(userId, 'legacy', { subprojects });
  const task = saved!.subprojects.flatMap(sub => sub.tasks)[0]!;
  expect(task.createdAt).toBeUndefined();
  expect(task.completedAt).toBeUndefined();
});
