import ContactsPage from '../components/ContactsPage';
import { getContactsSession } from '@/lib/server/auth';
import { getContactsServerEnv } from '@/lib/env.server';

export default async function ContactsHomePage({ searchParams }: { searchParams: Promise<{ userEmail?: string }> }) {
  const env = getContactsServerEnv();
  const session = await getContactsSession();
  const { userEmail } = await searchParams;
  return (
    <ContactsPage
      canManage={session.isAuthenticated}
      currentUserId={session.userId}
      currentUserEmail={userEmail}
    />
  );
}
