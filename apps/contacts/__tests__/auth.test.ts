import { cookies } from 'next/headers';
import { getContactsSession } from '@/lib/server/auth';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('getContactsSession helper', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns default user when authMode=none and no cookie present', async () => {
    (cookies as jest.Mock).mockReturnValue({ get: () => undefined });
    const sess = await getContactsSession();
    expect(sess.isAuthenticated).toBe(true);
    expect(sess.userId).toBe('local-user'); // matches default in env.server
  });

  it('respects contacts_dev_user cookie when set', async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: (name: string) => (name === 'contacts_dev_user' ? { value: 'bob' } : undefined),
    });
    const sess = await getContactsSession();
    expect(sess.isAuthenticated).toBe(true);
    expect(sess.userId).toBe('bob');
  });
});
