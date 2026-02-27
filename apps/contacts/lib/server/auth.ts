import 'server-only';

import { cookies } from 'next/headers';
import { getContactsServerEnv } from '../env.server';

export interface ContactsSession {
  userId: string;
  isAuthenticated: boolean;
}

export async function getContactsSession(): Promise<ContactsSession> {
  const env = getContactsServerEnv();
  if (env.authMode === 'none') {
    return {
      userId: env.defaultUserId,
      isAuthenticated: true,
    };
  }

  const cookieStore = await cookies();
  const rawSession = cookieStore.get('contacts_session')?.value;
  if (!rawSession || !rawSession.trim()) {
    return {
      userId: '',
      isAuthenticated: false,
    };
  }

  return {
    userId: rawSession,
    isAuthenticated: true,
  };
}
