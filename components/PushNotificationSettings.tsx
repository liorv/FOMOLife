'use client';

import { useEffect, useState } from 'react';
import { ensurePushSubscription, getPushPermissionStatus, type PushStatus } from '@/lib/client/pushNotifications';

export function PushNotificationSettings() {
  const [status, setStatus] = useState<PushStatus>('disabled');
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setStatus(getPushPermissionStatus());
    let active = true;
    void ensurePushSubscription().then((next) => {
      if (active) setStatus(next);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not check device notifications.');
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, []);

  const enable = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const next = await ensurePushSubscription(true);
      setStatus(next);
      if (next === 'enabled') setMessage('This device is registered for notifications.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not enable notifications.');
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Could not send the test notification.');
      setMessage('Test sent to your registered devices. Check your system notifications.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not send the test notification.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <strong>Browser &amp; mobile notifications</strong>
      <div style={{ fontSize: '0.8rem' }}>
        Enable on each browser or installed app to receive reminders and task completions even when FOMO Life is closed.
        On iPhone/iPad, open the app from your Home Screen first (iOS 16.4 or later).
      </div>
      {status === 'unsupported' ? (
        <div role="status">Push is unavailable here. Use a supported browser over HTTPS, or the installed Home Screen app on iPhone/iPad.</div>
      ) : status === 'blocked' ? (
        <div role="status">Notifications are blocked. Allow them in your browser or device settings, then reopen this panel.</div>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" disabled={busy} onClick={enable}>
            {busy ? 'Please wait...' : status === 'enabled' && !error ? 'Refresh device registration' : 'Enable on this device'}
          </button>
          {status === 'enabled' && !error && (
            <button type="button" disabled={busy} onClick={test}>Send test notification</button>
          )}
        </div>
      )}
      {message && <div role="status">{message}</div>}
      {error && <div role="alert">{error}</div>}
    </section>
  );
}
