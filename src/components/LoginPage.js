import React, { useState } from "react";
import { PROVIDERS, useAuth } from "../contexts/AuthContext";
import styles from "./LoginPage.module.css";

const logoUrl = "/assets/logo_fomo.png";

/**
 * Full-screen login page.
 *
 * Shows one button per enabled entry in PROVIDERS (currently Google only).
 * Adding more providers in the future is zero-UI-work: just set enabled: true
 * in AuthContext's PROVIDERS array once the Supabase OAuth app is configured.
 *
 * Disabled providers are intentionally not rendered — they will appear
 * automatically on the day they are enabled.
 */
export default function LoginPage() {
  const { signInWithProvider } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState(null);

  const enabledProviders = PROVIDERS.filter((p) => p.enabled);

  const handleSignIn = async (provider) => {
    setError(null);
    setLoadingProvider(provider.id);
    try {
      await signInWithProvider(provider.id);
      // Browser redirects — no further action needed here
    } catch (err) {
      setError("Sign-in failed. Please try again.");
      setLoadingProvider(null);
    }
  };

  return (
    <div className={styles["login-page"]}>
      <div className={styles["login-card"]}>
        {/* Branding */}
        <img src={logoUrl} alt="FOMO Life logo" className={styles["login-logo"]} />
        <h1 className={styles["login-title"]}>FOMO Life</h1>
        <p className={styles["login-subtitle"]}>
          Sign in to manage your tasks and projects
        </p>

        {/* Provider buttons */}
        <div className={styles["login-providers"]}>
          {enabledProviders.map((provider) => (
            <button
              key={provider.id}
              className={`${styles["login-provider-btn"]} ${styles[`login-provider-btn--${provider.id}`] || ""}`}
              onClick={() => handleSignIn(provider)}
              disabled={loadingProvider !== null}
              aria-label={provider.label}
            >
              {provider.iconSrc && (
                <img
                  src={provider.iconSrc}
                  alt=""
                  className={styles["login-provider-icon"]}
                  aria-hidden="true"
                />
              )}
              <span className={styles["login-provider-label"]}>
                {loadingProvider === provider.id
                  ? "Redirecting…"
                  : provider.label}
              </span>
            </button>
          ))}
        </div>

        {error && <p className={styles["login-error"]}>{error}</p>}

        <p className={styles["login-fine-print"]}>
          Your data is private and only accessible with your account.
          <br />
          New users are set up automatically — no registration needed.
        </p>
      </div>
    </div>
  );
}
