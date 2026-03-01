'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';

type GoogleLoginClientProps = {
  returnTo: string;
  forceAccountSelect?: boolean;
};

export default function GoogleLoginClient({ returnTo, forceAccountSelect = false }: GoogleLoginClientProps) {
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

  const handleGoogleLogin = async () => {
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
      provider: 'google',
      options,
    });

    if (error) {
      setErrorText('Unable to start Google sign-in. Please check provider configuration.');
      setIsBusy(false);
    }
  };

  return (
    <>
      <div className="login-providers">
        <button
          type="button"
          className="login-provider-btn login-provider-btn--google"
          onClick={handleGoogleLogin}
          disabled={isBusy}
          aria-label="Login with Google"
        >
          <img src="/assets/auth/google.svg" alt="" className="login-provider-icon" aria-hidden="true" />
          <span className="login-provider-label">{isBusy ? 'Redirecting…' : 'Login with Google'}</span>
        </button>
      </div>
      {errorText ? <p className="login-error">{errorText}</p> : null}
    </>
  );
}
