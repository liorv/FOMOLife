import 'server-only';

import type { ContactsAuthMode } from '@myorg/api-client';

export interface ContactsServerEnv {
  authMode: ContactsAuthMode;
  defaultUserId: string;
}

export function getContactsServerEnv(): ContactsServerEnv {
  const authMode = process.env.CONTACTS_AUTH_MODE ?? 'none';
  if (authMode !== 'none' && authMode !== 'mock-cookie') {
    throw new Error('Invalid CONTACTS_AUTH_MODE. Use "none" or "mock-cookie".');
  }

  const defaultUserId = process.env.CONTACTS_DEFAULT_USER_ID ?? 'local-user';
  if (!defaultUserId.trim()) {
    throw new Error('CONTACTS_DEFAULT_USER_ID must be a non-empty string when provided.');
  }

  return {
    authMode,
    defaultUserId,
  };
}
