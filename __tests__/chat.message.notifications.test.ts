jest.mock('server-only', () => ({}));
jest.mock('@myorg/storage', () => ({
  createStorageProvider: () => ({
    load: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
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
import { POST as postProjectComment } from '@/app/api/projects/comments/route';
import { POST as postFeedbackComment } from '@/app/api/feedback/comments/route';
import { listProjectNotifications } from '@/lib/projects/server/projectCommentsStore';
import { createFeedback, listNotifications } from '@/lib/feedback/server/feedbackStore';
import { listProjects } from '@/lib/projects/server/projectsStore';
import { sendPushToUser } from '@/lib/server/webPush';

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
      expect.objectContaining({ body: `Sender: ${message}` }),
    );
  });
});
