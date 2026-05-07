'use client';

import { useEffect, useState } from 'react';
import styles from './InstallPrompt.module.css';

const NEVER_KEY = 'pwa-install-never';
const SNOOZE_COOKIE = 'pwa-install-snoozed';
const SNOOZE_HOURS = 24;

function isSnoozed(): boolean {
  try {
    return document.cookie.split(';').some((c) => c.trim().startsWith(SNOOZE_COOKIE + '='));
  } catch { return false; }
}

function setSnooze(): void {
  try {
    const expires = new Date(Date.now() + SNOOZE_HOURS * 60 * 60 * 1000).toUTCString();
    document.cookie = `${SNOOZE_COOKIE}=1; expires=${expires}; path=/; SameSite=Lax`;
  } catch { /* ignore */ }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [neverShow, setNeverShow] = useState(false);

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Don't show if user chose "don't show again"
    try { if (localStorage.getItem(NEVER_KEY)) return; } catch { /* ignore */ }
    // Don't show if snoozed within the last 24 hours
    if (isSnoozed()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    if (neverShow) {
      try { localStorage.setItem(NEVER_KEY, '1'); } catch { /* ignore */ }
    } else {
      // Snooze for 24 hours via cookie
      setSnooze();
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.sheet}>
        <div className={styles.header}>
          <img src="/assets/logo_fomo.png" alt="FOMO Life" className={styles.icon} />
          <div>
            <div className={styles.title}>Add FOMO Life to your home screen</div>
            <div className={styles.subtitle}>Launch instantly, works offline</div>
          </div>
        </div>
        <label className={styles.neverRow}>
          <input
            type="checkbox"
            className={styles.neverCheck}
            checked={neverShow}
            onChange={(e) => setNeverShow(e.target.checked)}
          />
          <span className={styles.neverLabel}>Don&apos;t show this again</span>
        </label>
        <div className={styles.actions}>
          <button className={styles.btnDismiss} onClick={handleDismiss}>Not now</button>
          <button className={styles.btnInstall} onClick={handleInstall}>Install</button>
        </div>
      </div>
    </div>
  );
}
