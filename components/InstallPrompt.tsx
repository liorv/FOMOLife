'use client';

import { useEffect, useState } from 'react';
import styles from './InstallPrompt.module.css';

const STORAGE_KEY = 'pwa-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Don't show if user already dismissed
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch { /* ignore */ }

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
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
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
        <div className={styles.actions}>
          <button className={styles.btnDismiss} onClick={handleDismiss}>Not now</button>
          <button className={styles.btnInstall} onClick={handleInstall}>Install</button>
        </div>
      </div>
    </div>
  );
}
