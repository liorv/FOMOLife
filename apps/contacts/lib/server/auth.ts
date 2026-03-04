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
    // development mode: allow overriding via special cookie so tests and
    // manual dev flows can switch users on the fly without restarting.
    const cookieStore = await cookies();
    const frameworkDevUser = cookieStore.get('framework_dev_user')?.value;
    const contactsDevUser = cookieStore.get('contacts_dev_user')?.value;
    const devUser = (frameworkDevUser && frameworkDevUser.trim()) || (contactsDevUser && contactsDevUser.trim()) || env.defaultUserId;
    return {
      userId: devUser,
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
