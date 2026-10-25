import FrameworkPage from '../page';
import LoginPage from '../login/page';
import MockCookieLogin from '../login/MockCookieLogin';
import { redirect } from 'next/navigation';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';

jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => { throw new Error(`redirect:${url}`); }),
}));
jest.mock('@/lib/frameworkEnv.server', () => ({
  getFrameworkServerEnv: () => ({ authMode: 'mock-cookie' }),
}));
jest.mock('@/lib/server/frameworkAuth', () => ({
  getFrameworkSession: jest.fn(),
  getDisplayNameFromUserId: (name: string) => name,
  getInitials: () => 'U',
}));
jest.mock('@/components/FrameworkHost', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/LandingPage', () => ({ __esModule: true, default: () => null }));
jest.mock('../login/OAuthLoginClient', () => ({ __esModule: true, default: () => null }));

const mockSession = jest.mocked(getFrameworkSession);
const target = '/?tab=projects&projectId=shared-project&view=plan';

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockResolvedValue({
    isAuthenticated: false, userId: '', authMode: 'mock-cookie',
  });
});

it('preserves a signed-out visitor destination across login', async () => {
  await expect(FrameworkPage({
    searchParams: Promise.resolve({ tab: 'projects', projectId: 'shared-project', view: 'plan' }),
  })).rejects.toThrow(`redirect:/login?returnTo=${encodeURIComponent(target)}`);
  expect(redirect).toHaveBeenCalledWith(`/login?returnTo=${encodeURIComponent(target)}`);
});

it('leaves ordinary signed-out visits on the landing page', async () => {
  await FrameworkPage({});
  expect(redirect).not.toHaveBeenCalled();
});

it('returns an already authenticated visitor to their intended project', async () => {
  mockSession.mockResolvedValue({ isAuthenticated: true, userId: 'member', authMode: 'mock-cookie' });
  await expect(LoginPage({ searchParams: Promise.resolve({ returnTo: target }) }))
    .rejects.toThrow(`redirect:${target}`);
});

it.each(['//example.com', '/\\example.com'])('rejects non-local login destinations: %s', async returnTo => {
  mockSession.mockResolvedValue({ isAuthenticated: true, userId: 'member', authMode: 'mock-cookie' });
  await expect(LoginPage({ searchParams: Promise.resolve({ returnTo }) })).rejects.toThrow('redirect:/');
  expect(redirect).toHaveBeenCalledWith('/');
});

it('passes the project destination to mock-cookie login', async () => {
  const page = await LoginPage({ searchParams: Promise.resolve({ returnTo: target }) });
  // Inspect the server-rendered login element without invoking client-side auth.
  const card = page.props.children;
  const login = card.props.children.find((child: { type?: unknown }) => child?.type === MockCookieLogin);
  expect(login.props.returnTo).toBe(target);
});
