import ContactsPage from '../components/ContactsPage';
import { getContactsSession } from '@/lib/server/auth';
import { getContactsServerEnv } from '@/lib/env.server';

export default async function ContactsHomePage() {
  const env = getContactsServerEnv();
  const session = await getContactsSession();
  return (
    <ContactsPage
      canManage={session.isAuthenticated}
      devMode={env.authMode === 'none'}
      currentUserId={session.userId}
      defaultUserId={env.defaultUserId}
    />
  );
}
