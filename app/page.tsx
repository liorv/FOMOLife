import FrameworkHost from '@/components/FrameworkHost';
import LandingPage from '@/components/LandingPage';
import { getDisplayNameFromUserId, getFrameworkSession, getInitials } from '@/lib/server/frameworkAuth';
import { getFrameworkServerEnv } from '@/lib/frameworkEnv.server';
import { redirect } from 'next/navigation';

export default async function FrameworkPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const env = getFrameworkServerEnv();
  const session = await getFrameworkSession();
  if (!session.isAuthenticated) {
    const search = (await searchParams) ?? {};
    if (search.projectId) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(search)) {
        if (typeof value === 'string') params.set(key, value);
        else if (Array.isArray(value)) value.forEach(item => params.append(key, item));
      }
      redirect(`/login?returnTo=${encodeURIComponent(`/?${params.toString()}`)}`);
    }
    return <LandingPage />;
  }

  const nameSource = session.userName || session.userEmail || session.userId;
  const userName = getDisplayNameFromUserId(nameSource);
  const userInitials = getInitials(userName);

  return (
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
  );
}
