import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import FrameworkHost from '@/components/FrameworkHost';
import { getDisplayNameFromUserId, getFrameworkSession, getInitials } from '@/lib/server/frameworkAuth';
import { getFrameworkServerEnv } from '@/lib/frameworkEnv.server';

export default async function FrameworkPage() {
  const env = getFrameworkServerEnv();
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) {
    redirect('/login');
  }

  const nameSource = session.userName || session.userEmail || session.userId;
  const userName = getDisplayNameFromUserId(nameSource);
  const userInitials = getInitials(userName);

  return (
    <Suspense fallback={<main className="main-layout" />}>
      <FrameworkHost
        userId={session.userId}
        userName={userName}
        userEmail={session.userEmail ?? session.userId}
        userInitials={userInitials}
        userAvatarUrl={session.userAvatarUrl ?? ''}
        canSignOut={session.authMode !== 'none'}
        devMode={env.authMode === 'none'}
        defaultUserId={env.defaultUserId}
      />
    </Suspense>
  );
}
