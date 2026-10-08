'use client';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushStatus = 'unsupported' | 'blocked' | 'disabled' | 'enabled';

export function getPushPermissionStatus(): PushStatus {
  if (typeof window === 'undefined' || !window.isSecureContext ||
      !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' ? 'enabled' : 'disabled';
}

/** Permission prompts must start synchronously from a user gesture (including on iOS). */
export async function ensurePushSubscription(requestPermission = false): Promise<PushStatus> {
  const status = getPushPermissionStatus();
  if (status === 'unsupported' || status === 'blocked') return status;
  if (Notification.permission !== 'granted') {
    if (!requestPermission) return 'disabled';
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'disabled';
  }

  const response = await fetch('/api/push/subscribe', { cache: 'no-store' });
  if (!response.ok) throw new Error('Push notifications are not configured on the server. Please contact the app administrator.');
  const { publicKey } = await response.json();
  if (typeof publicKey !== 'string' || !publicKey) throw new Error('The server returned an invalid push key.');

  await navigator.serviceWorker.register('/sw.js');
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  if (subscription) {
    const existingKey = subscription.options.applicationServerKey;
    if (existingKey && (
      existingKey.byteLength !== applicationServerKey.byteLength ||
      new Uint8Array(existingKey).some((byte, index) => byte !== applicationServerKey[index])
    )) {
      if (!await subscription.unsubscribe()) throw new Error('Could not replace the old push subscription.');
      subscription = null;
    }
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
  }

  const saved = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  if (!saved.ok) throw new Error('Could not save this device for notifications. Please try again.');
  return 'enabled';
}
