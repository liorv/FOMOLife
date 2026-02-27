import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import '../src/index.css';
import '../src/App.css';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import LoginPage from '../src/components/LoginPage';
import { supabase } from '../src/api/supabaseClient';

/**
 * Inner shell — has access to AuthContext.
 * Renders the page while threading the authenticated user's ID through as a
 * prop, or shows the LoginPage when there is no active session.
 */
function AuthGate({ Component, pageProps }) {
  const { session, loading, signOut } = useAuth();
  const router = useRouter();
  const legacyTab = Array.isArray(router.query.tab) ? router.query.tab[0] : router.query.tab;
  const allowLegacyTabRedirect = router.isReady && typeof legacyTab === 'string' && legacyTab.length > 0;

  if (allowLegacyTabRedirect) {
    return <Component {...pageProps} />;
  }

  if (loading) {
    // Minimal loading state — avoids flash of the login screen on refresh
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: '#f1f3f4',
        fontFamily: '"Roboto", "Segoe UI", Arial, sans-serif',
        color: '#5f6368',
        fontSize: 15,
      }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  // Pass the Supabase Auth user ID into every page as a prop.
  // Components that need it (App.js) already accept a `userId` prop.
  return <Component {...pageProps} userId={session.user.id} authUser={session.user} onSignOut={signOut} />;
}

export default function MyApp({ Component, pageProps }) {
  // If Supabase is not configured (e.g. local dev without .env.local) we skip
  // the auth gate so the app remains usable during development.
  const withAuthGate = !!supabase;

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {withAuthGate ? (
        <AuthProvider>
          <AuthGate Component={Component} pageProps={pageProps} />
        </AuthProvider>
      ) : (
        <Component {...pageProps} />
      )}
    </>
  );
}
