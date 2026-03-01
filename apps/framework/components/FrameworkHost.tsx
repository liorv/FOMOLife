'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import LogoBar from './LogoBar';
import TabNav from './TabNav';
import { getFrameworkTabLinks, normalizeTab, type FrameworkTab } from '@/lib/frameworkConfig';

type FrameworkHostProps = {
  appName?: string;
  userName: string;
  userEmail?: string;
  userInitials: string;
  canSignOut: boolean;
};

export default function FrameworkHost({ appName: _appName, userName, userEmail, userInitials, canSignOut }: FrameworkHostProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = normalizeTab(searchParams.get('tab') ?? undefined);
  const tabs = useMemo(() => getFrameworkTabLinks(), []);
  const activeTabConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const showHeaderSearch = activeTab === 'tasks' || activeTab === 'projects';
  const headerSearchQuery = searchParams.get('q') ?? '';

  const handleTabChange = (tab: FrameworkTab) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', tab);
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  const handleHeaderSearchChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  const hostedSrc = useMemo(() => {
    const href = activeTabConfig?.href;
    if (!href) return undefined;

    const queryParts = ['embedded=1'];
    if (showHeaderSearch && headerSearchQuery.trim()) {
      queryParts.push(`q=${encodeURIComponent(headerSearchQuery)}`);
    }

    const base = href.split('#')[0] ?? href;
    const separator = base.includes('?') ? '&' : '?';
    return `${href}${separator}${queryParts.join('&')}`;
  }, [activeTabConfig?.href, headerSearchQuery, showHeaderSearch]);

  const frameKey = activeTabConfig?.key ?? activeTab;
  const frameLabel = activeTabConfig?.label ?? 'App';

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      });
    } finally {
      router.replace('/login');
    }
  };

  return (
    <main className="main-layout">
      <LogoBar
        showSearch={showHeaderSearch}
        searchValue={headerSearchQuery}
        searchPlaceholder={activeTab === 'tasks' ? 'Search tasks…' : 'Search projects…'}
        onSearchChange={handleHeaderSearchChange}
        userName={userName}
        userEmail={userEmail ?? ''}
        userInitials={userInitials}
        canSignOut={canSignOut}
        onSignOut={handleSignOut}
      />
      <div className="app-outer">
        <div className="container framework-container">
          <section className="host-pane" aria-label="Hosted app content">
            {hostedSrc ? (
              <iframe
                key={frameKey}
                title={`${frameLabel} app`}
                src={hostedSrc}
                className="host-frame"
              />
            ) : (
              <div className="host-empty">
                <h2>{activeTabConfig?.label ?? 'App'} URL not configured</h2>
                <p>Set NEXT_PUBLIC_*_APP_URL variables in this app to host the migrated tabs.</p>
              </div>
            )}
          </section>
        </div>
        <TabNav active={activeTab} tabs={tabs} onChange={handleTabChange} />
      </div>
    </main>
  );
}
