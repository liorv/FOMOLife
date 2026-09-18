import 'server-only';

import webpush from 'web-push';
import { createStorageProvider } from '@myorg/storage';
import type { PersistedUserData } from '@myorg/storage';
import { withKeyedLock } from '@myorg/utils';

const storage = createStorageProvider();
const SUBS_KEY_PREFIX = '__push_subs__';

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@fomolife.app';
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

function subsKey(userId: string): string {
  return `${SUBS_KEY_PREFIX}${userId}`;
}

function lockKey(userId: string): string {
  return `push-subs:${userId}`;
}

async function loadSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
  try {
    const persisted = await storage.load(subsKey(userId));
    return (Array.isArray(persisted?.subscriptions) ? persisted.subscriptions : []) as PushSubscriptionRecord[];
  } catch {
    return [];
  }
}

async function saveSubscriptions(userId: string, subs: PushSubscriptionRecord[]): Promise<void> {
  const data: PersistedUserData = { subscriptions: subs };
  await storage.save(subsKey(userId), data);
}

export async function addPushSubscription(userId: string, sub: PushSubscriptionRecord): Promise<void> {
  await withKeyedLock(lockKey(userId), async () => {
    const subs = await loadSubscriptions(userId);
    const filtered = subs.filter((s) => s.endpoint !== sub.endpoint);
    filtered.push(sub);
    await saveSubscriptions(userId, filtered);
  });
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  await withKeyedLock(lockKey(userId), async () => {
    const subs = await loadSubscriptions(userId);
    await saveSubscriptions(userId, subs.filter((s) => s.endpoint !== endpoint));
  });
}

/** Sends a web push notification to every device the user has subscribed on, pruning dead subscriptions. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  const subs = await loadSubscriptions(userId);
  if (subs.length === 0) return;

  const staleEndpoints: string[] = [];
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload));
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        } else {
          console.error('Failed to send push notification:', err?.message ?? err);
        }
      }
    }),
  );

  if (staleEndpoints.length > 0) {
    await withKeyedLock(lockKey(userId), async () => {
      const current = await loadSubscriptions(userId);
      await saveSubscriptions(userId, current.filter((s) => !staleEndpoints.includes(s.endpoint)));
    });
  }
}
