import React from 'react';
import { act, render, screen } from '@testing-library/react';
import FeedbackPage from '../FeedbackPage';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('tab=feedback&feedbackId=feedback'),
}));
jest.mock('@/lib/client/feedbackCache', () => ({
  getFeedbackCacheSync: () => null,
  setFeedbackCache: jest.fn(),
}));
jest.mock('../ContentHeader', () => ({ __esModule: true, default: () => null }));
jest.mock('../FeedbackThread', () => ({
  __esModule: true,
  default: ({ item }: { item: { id: string } }) => <div data-testid="feedback-thread">{item.id}</div>,
}));

it('opens the feedback conversation after its data arrives, without a timing delay', async () => {
  const originalFetch = global.fetch;
  let resolve!: (response: Response) => void;
  const pending = new Promise<Response>(res => { resolve = res; });
  global.fetch = jest.fn(() => pending);
  try {
    render(<FeedbackPage userId="user" userName="User" />);
    expect(screen.queryByTestId('feedback-thread')).not.toBeInTheDocument();
    await act(async () => {
      resolve({
        ok: true,
        json: async () => ({
          feedback: [{
            id: 'feedback', type: 'feature', title: 'Feedback', description: '',
            authorId: 'author', authorName: 'Author', createdAt: new Date().toISOString(),
            votes: {}, completions: {}, comments: [],
          }],
        }),
      } as Response);
    });
    expect(screen.getByTestId('feedback-thread')).toHaveTextContent('feedback');
  } finally {
    global.fetch = originalFetch;
  }
});
