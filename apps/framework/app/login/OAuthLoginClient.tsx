'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';

type OAuthProvider = 'google' | 'x';

type ProviderConfig = {
  id: OAuthProvider;
  name: string;
  icon: string;
  label: string;
  cssClass: string;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'google',
    name: 'Google',
    icon: '/assets/auth/google.svg',
    label: 'Login with Google',
    cssClass: 'login-provider-btn--google',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    icon: '/assets/auth/twitter.svg',
    label: 'Login with X',
    cssClass: 'login-provider-btn--twitter',
  },
];

type OAuthLoginClientProps = {
  returnTo: string;
  forceAccountSelect?: boolean;
};

export default function OAuthLoginClient({ returnTo, forceAccountSelect = false }: OAuthLoginClientProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [errorText, setErrorText] = useState('');
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    let isMounted = true;

    async function completePendingOauth() {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (error) {
        setErrorText('Could not finish Google sign-in. Please try again.');
        return;
      }

      const session = data.session;
      const user = session?.user;
      if (!session || !user) {
        return;
      }

      setIsBusy(true);
      const apiResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: session.access_token,
          returnTo,
        }),
      });

      if (!isMounted) return;

      if (!apiResponse.ok) {
        setErrorText('Sign-in succeeded with Google, but app session could not be created.');
        setIsBusy(false);
        return;
      }

      await supabase.auth.signOut();
      router.replace(returnTo);
    }

    void completePendingOauth();

    return () => {
      isMounted = false;
    };
  }, [returnTo, router, supabase]);

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setErrorText('');
    setIsBusy(true);

    const redirectTo = `${window.location.origin}/login`;
    const options = forceAccountSelect
      ? {
          redirectTo,
          queryParams: { prompt: 'select_account' },
        }
      : { redirectTo };

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });

    if (error) {
      setErrorText(`Unable to start ${PROVIDERS.find(p => p.id === provider)?.name} sign-in. Please check provider configuration.`);
      setIsBusy(false);
    }
  };

  return (
    <>
      <div className="login-providers">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className={`login-provider-btn ${provider.cssClass}`}
            onClick={() => handleOAuthLogin(provider.id)}
            disabled={isBusy}
            aria-label={`Login with ${provider.name}`}
          >
            <img src={provider.icon} alt="" className="login-provider-icon" aria-hidden="true" />
            <span className="login-provider-label">{isBusy ? 'Redirecting…' : provider.label}</span>
          </button>
        ))}
      </div>
      {errorText ? <p className="login-error">{errorText}</p> : null}
    </>
  );
}
