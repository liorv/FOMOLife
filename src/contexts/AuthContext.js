/**
 * AuthContext — centralised authentication state for FOMO Life.
 *
 * Architecture is intentionally provider-agnostic: to support a new OAuth
 * provider you only need to add one entry to the PROVIDERS array and (if the
 * Supabase SDK needs a custom icon/label) update the entry there.  The rest
 * of the app (LoginPage, AuthProvider, etc.) requires no changes.
 *
 * Currently-enabled providers:
 *   • google
 *
 * Providers ready to be enabled (change `enabled: false` → `true` once the
 * corresponding OAuth app is configured in your Supabase project settings):
 *   • apple, microsoft, twitter (X), facebook
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

/**
 * Each entry describes one OAuth identity provider.
 *
 * Fields:
 *   id       – supabase provider string (passed to signInWithOAuth)
 *   label    – human-readable button label
 *   iconSrc  – path to SVG/PNG inside /public/assets/auth/  (or null for
 *              simple text-only buttons)
 *   enabled  – set to true when the provider is configured in Supabase
 */
export const PROVIDERS = [
  {
    id: "google",
    label: "Continue with Google",
    iconSrc: "/assets/auth/google.svg",
    enabled: true,
  },
  {
    id: "apple",
    label: "Continue with Apple",
    iconSrc: "/assets/auth/apple.svg",
    enabled: false,
  },
  {
    id: "azure",
    label: "Continue with Microsoft",
    iconSrc: "/assets/auth/microsoft.svg",
    enabled: false,
  },
  {
    id: "twitter",
    label: "Continue with X",
    iconSrc: "/assets/auth/x.svg",
    enabled: false,
  },
  {
    id: "facebook",
    label: "Continue with Facebook",
    iconSrc: "/assets/auth/facebook.svg",
    enabled: false,
  },
];

const PROMPT_KEY = "fomo_next_auth_prompt";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);

/**
 * Wraps the entire application.  Provides:
 *   session          – current Supabase Session or null
 *   user             – shorthand for session?.user
 *   loading          – true until the initial session check resolves
 *   signInWithProvider(providerId) – kicks off OAuth redirect flow
 *   signOut(mode)    – 'soft' clears session but auto-reconnects next visit;
 *                      'hard' (default) forces the account chooser next time
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithProvider(providerId) {
    // Read prompt preference set by the last sign-out
    const storedPrompt = localStorage.getItem(PROMPT_KEY);
    // Default to 'select_account' if no preference stored (first visit / hard logout)
    const prompt = storedPrompt === "auto" ? "none" : "select_account";
    localStorage.removeItem(PROMPT_KEY);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: providerId,
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt },
      },
    });
    if (error) {
      console.error("OAuth sign-in error:", error.message);
      throw error;
    }
  }

  /**
   * Sign out.
   * @param {'soft'|'hard'} mode
   *   soft – session cleared; next visit auto-reconnects the same Google account
   *   hard – session cleared; next visit shows the Google account chooser
   */
  async function signOut(mode = "hard") {
    if (mode === "soft") {
      localStorage.setItem(PROMPT_KEY, "auto");
    } else {
      localStorage.removeItem(PROMPT_KEY);
    }
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Sign-out error:", error.message);
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signInWithProvider,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Convenience hook — throws if used outside an AuthProvider. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an <AuthProvider>");
  }
  return ctx;
}
