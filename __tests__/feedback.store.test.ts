jest.mock('server-only', () => ({}));
jest.mock('@/lib/server/frameworkAuth', () => ({
  getDisplayNameFromUserId: (userId: string) => userId,
}));

import {
  addComment,
  createFeedback,
  listFeedback,
  markFeedbackComplete,
  voteFeedback,
} from '@/lib/feedback/server/feedbackStore';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('feedback inactivity completion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('archives an item with one completion after 30 days without activity', async () => {
    const item = await createFeedback('creator', 'Creator', {
      type: 'feature',
      title: 'Old request',
      description: '',
    });
    await markFeedbackComplete('reviewer', item.id, true);

    jest.advanceTimersByTime(30 * DAY_MS);

    await expect(listFeedback()).resolves.toEqual([]);
  });

  it('resets the inactivity window when the item changes', async () => {
    const item = await createFeedback('creator', 'Creator', {
      type: 'feature',
      title: 'Active request',
      description: '',
    });
    await markFeedbackComplete('reviewer', item.id, true);

    jest.advanceTimersByTime(29 * DAY_MS);
    await voteFeedback('voter', item.id, 1);
    await addComment(item.id, 'commenter', 'Commenter', 'Still relevant');
    jest.advanceTimersByTime(2 * DAY_MS);

    const feedback = await listFeedback();
    expect(feedback).toHaveLength(1);
    expect(feedback[0]?.id).toBe(item.id);
  });
});