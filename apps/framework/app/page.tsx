import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import FrameworkHost from '@/components/FrameworkHost';
import { getDisplayNameFromUserId, getFrameworkSession, getInitials } from '@/lib/server/frameworkAuth';

export default async function FrameworkPage() {
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) {
    redirect('/login');
  }

  const userName = getDisplayNameFromUserId(session.userId);
  const userInitials = getInitials(userName);

  return (
    <Suspense fallback={<main className="main-layout" />}>
      <FrameworkHost
        userName={userName}
        userEmail={session.userId}
        userInitials={userInitials}
        canSignOut={session.authMode === 'mock-cookie'}
      />
    </Suspense>
  );
}
