jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: async (key: string) => mockRows.get(key) ?? null,
    save: async (key: string, data: PersistedUserData) => { mockRows.set(key, data); },
  }),
}));
jest.mock('@/lib/server/frameworkAuth', () => ({
  getDisplayNameFromUserId: (userId: string) => userId,
  getFrameworkSession: jest.fn().mockResolvedValue({
    isAuthenticated: true,
    userId: 'sender',
    userName: 'Sender',
  }),
}));
jest.mock('@/lib/server/webPush', () => ({
  sendPushToUser: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
}));
jest.mock('@/lib/projects/server/projectsStore', () => ({
  listProjects: jest.fn(),
  resolveProjectOwner: jest.fn(),
}));

import type { ProjectItem } from '@myorg/types';
import type { PersistedUserData } from '@myorg/storage';
import { POST as postProjectComment } from '@/app/api/projects/comments/route';
import { POST as postFeedbackComment } from '@/app/api/feedback/comments/route';
import { listProjectNotifications } from '@/lib/projects/server/projectCommentsStore';
import { addComment, createFeedback, listNotifications } from '@/lib/feedback/server/feedbackStore';
import { listProjects, resolveProjectOwner } from '@/lib/projects/server/projectsStore';
import { sendPushToUser } from '@/lib/server/webPush';

const mockRows = new Map<string, PersistedUserData>();

describe('immediate chat message notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notifies the task creator and assignees with the full message', async () => {
    const project: ProjectItem = {
      id: 'project',
      text: 'Project',
      color: 'blue',
      creatorId: 'task-creator',
      members: [
        { userId: 'task-creator', name: 'Creator' },
        { userId: 'assignee', name: 'Assigned Person' },
        { userId: 'other-member', name: 'Other Person' },
      ],
      subprojects: [{
        id: 'subproject',
        text: 'Subproject',
        tasks: [{
          id: 'task',
          text: 'Task',
          done: false,
          dueDate: null,
          favorite: false,
          people: [{ name: 'Assigned Person' }],
        }],
      }],
    };
    jest.mocked(listProjects).mockResolvedValue([project]);
    const message = `This is a complete task chat message with more than one hundred and twenty characters. ${'Please read the entire message. '.repeat(5)}`.trim();

    const response = await postProjectComment(new Request('http://localhost/api/projects/comments', {
      method: 'POST',
      body: JSON.stringify({
        threadId: 'task:project:task',
        threadTitle: 'Task',
        projectId: 'project',
        taskId: 'task',
        text: message,
      }),
    }));

    expect(response.status).toBe(200);
    expect((await listProjectNotifications('task-creator'))[0]?.commentText).toBe(message);
    expect((await listProjectNotifications('assignee'))[0]?.commentText).toBe(message);
    expect(await listProjectNotifications('other-member')).toEqual([]);
    expect(jest.mocked(sendPushToUser).mock.calls.map(([userId]) => userId).sort()).toEqual([
      'assignee',
      'task-creator',
    ]);
    expect(jest.mocked(sendPushToUser).mock.calls[0]?.[1].body).toContain(message);
    expect(jest.mocked(sendPushToUser).mock.calls[0]?.[1].url)
      .toBe('/?tab=projects&projectId=project&threadId=task%3Aproject%3Atask');
  });

  it('immediately notifies the feedback creator with the full message', async () => {
    const feedback = await createFeedback('feedback-creator', 'Feedback Creator', {
      type: 'feature',
      title: 'Feedback',
      description: 'Description',
    });
    const message = `This is a full feedback message. ${'The entire message should be readable. '.repeat(5)}`.trim();

    const response = await postFeedbackComment(new Request('http://localhost/api/feedback/comments', {
      method: 'POST',
      body: JSON.stringify({ feedbackId: feedback.id, text: message }),
    }));

    expect(response.status).toBe(201);
    expect((await listNotifications('feedback-creator'))[0]?.commentText).toBe(message);
    expect(sendPushToUser).toHaveBeenCalledWith(
      'feedback-creator',
      expect.objectContaining({ body: `Sender: ${message}`, url: `/?tab=feedback&feedbackId=${feedback.id}` }),
    );
  });

  it.each([true, false])('notifies task creator, assignees, and prior commenters with explicit task ID %s', async (explicitTaskId) => {
    const projectId = `recipients-${explicitTaskId}`;
    const threadId = `task:${projectId}:task`;
    jest.mocked(listProjects).mockResolvedValue([{
      id: projectId, text: 'Project', color: 'blue', creatorId: 'creator',
      members: [
        { userId: 'assignee', name: 'Assigned' },
        { userId: 'sender', name: 'Sender' },
        { userId: 'uninvolved', name: 'Uninvolved' },
      ],
      subprojects: [{
        id: 'subproject', text: 'Subproject',
        tasks: [{
          id: 'task', text: 'Task', done: false, dueDate: null, favorite: false,
          people: [{ name: 'Assigned' }, { name: 'Sender' }],
        }],
      }],
    }]);
    mockRows.set(`__proj_thread__${threadId}`, {
      comments: [
        { id: 'one', authorId: 'prior-commenter' },
        { id: 'two', authorId: 'prior-commenter' },
        { id: 'three', authorId: 'assignee' },
        { id: 'four', authorId: 'creator' },
        { id: 'five', authorId: 'sender' },
      ],
    });
    mockRows.set(`__proj_thread__task:${projectId}:other-task`, {
      comments: [{ id: 'other', authorId: 'unrelated-commenter' }],
    });

    const result = await postProjectComment(new Request('http://localhost/api/projects/comments', {
      method: 'POST',
      body: JSON.stringify({
        threadId, projectId, threadTitle: 'Task', text: 'New reply',
        ...(explicitTaskId ? { taskId: 'task' } : {}),
      }),
    }));

    expect(result.status).toBe(200);
    expect(jest.mocked(sendPushToUser).mock.calls.map(([id]) => id).sort())
      .toEqual(['assignee', 'creator', 'prior-commenter']);
    for (const id of ['assignee', 'creator', 'prior-commenter']) {
      expect(await listProjectNotifications(id)).toEqual(expect.arrayContaining([
        expect.objectContaining({ threadId, taskId: 'task', commentText: 'New reply' }),
      ]));
    }
  });

  it('includes a legacy project owner even when absent from the member list', async () => {
    jest.mocked(resolveProjectOwner).mockResolvedValue('legacy-owner');
    jest.mocked(listProjects).mockResolvedValue([{
      id: 'legacy-project', text: 'Project', color: 'blue', subprojects: [],
      members: [{ userId: 'sender', name: 'Sender' }],
    }]);
    await postProjectComment(new Request('http://localhost/api/projects/comments', {
      method: 'POST',
      body: JSON.stringify({
        threadId: 'proj:legacy-project', projectId: 'legacy-project',
        threadTitle: 'Project', text: 'Project reply',
      }),
    }));
    expect(jest.mocked(sendPushToUser).mock.calls.map(([id]) => id)).toEqual(['legacy-owner']);
  });

  it('notifies the feedback creator and every prior commenter once, excluding the sender', async () => {
    const feedback = await createFeedback('feedback-owner', 'Owner', {
      type: 'feature', title: 'Discussion', description: '',
    });
    await addComment(feedback.id, 'previous-person', 'Previous', 'First comment');
    await addComment(feedback.id, 'previous-person', 'Previous', 'Another comment');
    await addComment(feedback.id, 'feedback-owner', 'Owner', 'Creator reply');
    await addComment(feedback.id, 'sender', 'Sender', 'Previous sender comment');
    const unrelated = await createFeedback('unrelated-owner', 'Unrelated', {
      type: 'feature', title: 'Other discussion', description: '',
    });
    await addComment(unrelated.id, 'unrelated-commenter', 'Unrelated', 'Unrelated reply');
    jest.mocked(sendPushToUser).mockClear();

    await postFeedbackComment(new Request('http://localhost/api/feedback/comments', {
      method: 'POST',
      body: JSON.stringify({ feedbackId: feedback.id, text: 'Latest reply' }),
    }));

    expect(jest.mocked(sendPushToUser).mock.calls.map(([id]) => id).sort())
      .toEqual(['feedback-owner', 'previous-person']);
    for (const id of ['feedback-owner', 'previous-person']) {
      expect(await listNotifications(id)).toEqual(expect.arrayContaining([
        expect.objectContaining({ feedbackId: feedback.id, commentText: 'Latest reply' }),
      ]));
    }
  });
});
