import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getFrameworkServerEnv } from '@/lib/frameworkEnv.server';
import { getFrameworkSession } from '@/lib/server/frameworkAuth';
import OAuthLoginClient from './OAuthLoginClient';
import MockCookieLogin from './MockCookieLogin';

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const env = getFrameworkServerEnv();
  const session = await getFrameworkSession();
  if (session.isAuthenticated) {
    redirect('/');
  }

  const resolvedSearch = (await searchParams) ?? {};
  const errorValue = Array.isArray(resolvedSearch.error) ? resolvedSearch.error[0] : resolvedSearch.error;
  const showMissingUserError = errorValue === 'missing-user';
  const returnToRaw = Array.isArray(resolvedSearch.returnTo) ? resolvedSearch.returnTo[0] : resolvedSearch.returnTo;
  const returnTo = typeof returnToRaw === 'string' && returnToRaw.startsWith('/') ? returnToRaw : '/';
  const switchUserRaw = Array.isArray(resolvedSearch.switchUser) ? resolvedSearch.switchUser[0] : resolvedSearch.switchUser;
  const forceAccountSelect = switchUserRaw === '1' || switchUserRaw === 'true';

  return (
    <main className={env.authMode === 'supabase-google' ? 'login-page' : 'auth-screen'}>
      <div className={env.authMode === 'supabase-google' ? 'login-card' : 'auth-card'}>
        <Image
          src="/assets/logo_fomo.png"
          alt="FOMO Life logo"
          className={env.authMode === 'supabase-google' ? 'login-logo' : 'auth-logo'}
          width={160}
          height={160}
          priority
        />
        {env.authMode === 'supabase-google' ? <h1 className="login-title">FOMO Life</h1> : <h1 className="auth-title">Sign in to FOMO Life</h1>}
        {env.authMode === 'supabase-google' ? (
          <p className="login-subtitle">Sign in to manage your tasks and projects</p>
        ) : (
          <p className="auth-subtitle">Use a simple user ID to open your framework workspace.</p>
        )}

        {env.authMode === 'none' ? (
          <form method="get" action="/" className="auth-form">
            <p className="auth-mode-note">
              Framework auth mode is <strong>none</strong>; no login is required in this environment.
            </p>
            <button type="submit" className="auth-submit">
              Continue to app
            </button>
          </form>
        ) : env.authMode === 'mock-cookie' ? (
          <MockCookieLogin showMissingUserError={showMissingUserError} />
        ) : (
          <>
            <OAuthLoginClient returnTo={returnTo} forceAccountSelect={forceAccountSelect} />
            <p className="login-fine-print">
              Your data is private and only accessible with your account.
              <br />
              New users are set up automatically — no registration needed.
            </p>
          </>
        )}
        <p className="login-legal">
          By using this service, you agree to our{' '}
          <a href="/privacy">Privacy Policy</a>
          {' '}and{' '}
          <a href="/terms">Terms of Service</a>.
        </p>
      </div>
    </main>
  );
}