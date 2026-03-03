'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LogoBar, TabNav } from '@myorg/ui';
import { getFrameworkTabLinks, normalizeTab, type FrameworkTab } from '../lib/frameworkConfig';

type FrameworkHostProps = {
  appName?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userInitials: string;
  userAvatarUrl?: string;
  canSignOut: boolean;
};

export default function FrameworkHost({ appName: _appName, userId, userName, userEmail, userInitials, userAvatarUrl, canSignOut }: FrameworkHostProps) {
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
    if (userId.trim()) {
      queryParts.push(`uid=${encodeURIComponent(userId)}`);
    }
    if (showHeaderSearch && headerSearchQuery.trim()) {
      queryParts.push(`q=${encodeURIComponent(headerSearchQuery)}`);
    }

    const base = href.split('#')[0] ?? href;
    const separator = base.includes('?') ? '&' : '?';
    return `${href}${separator}${queryParts.join('&')}`;
  }, [activeTabConfig?.href, headerSearchQuery, showHeaderSearch, userId]);

  const frameKey = activeTabConfig?.key ?? activeTab;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [thumbIcon, setThumbIcon] = useState<string>('add');
  const [thumbAction, setThumbAction] = useState<string>('thumb-fab');

  const handleThumb = () => {
    try {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        // send whichever action the app registered (defaults to thumb-fab)
        win.postMessage({ type: thumbAction || 'thumb-fab' }, '*');
      }
    } catch (err) {
      // ignore
    }
  };
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

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event?.data) return;
      const { type, icon, action } = event.data as {
        type?: string;
        icon?: unknown;
        action?: unknown;
      };
      if (type === 'thumb-icon' && typeof icon === 'string') {
        setThumbIcon(icon);
      } else if (type === 'thumb-config') {
        if (typeof icon === 'string') {
          // if the icon is a path (starts with /) we should fetch it from the
          // sender's origin so that assets hosted by other apps resolve
          let resolved = icon;
          if (icon.startsWith('/') && event.origin) {
            resolved = `${event.origin}${icon}`;
          }
          setThumbIcon(resolved);
        }
        if (typeof action === 'string') {
          setThumbAction(action);
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // reset thumb icon/action when switching tabs and request fresh config
  useEffect(() => {
    // provide an immediate fallback for apps that default to add (tasks/projects)
    if (activeTab === 'tasks') {
      setThumbIcon('add');
    } else {
      // non-content tabs start blank until the frame replies
      setThumbIcon('');
    }
    setThumbAction('thumb-fab');

    // ask embedded app what it wants the thumb button to do
    const win = iframeRef.current?.contentWindow;
    if (win) {
      try {
        win.postMessage({ type: 'get-thumb-config' }, '*');
      } catch {
        // ignore
      }
    }
  }, [activeTab, frameKey]);

  const handleSwitchUsers = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      });
    } finally {
      router.replace('/login?switchUser=1');
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
        userAvatarUrl={userAvatarUrl ?? ''}
        canSignOut={canSignOut}
        onSoftLogout={handleSignOut}
        onSwitchUsers={handleSwitchUsers}
      />
      <div className="app-outer">
        <div className="container framework-container">
          <section className="host-pane" aria-label="Hosted app content">
            {hostedSrc ? (
              <iframe
                ref={iframeRef}
                key={frameKey}
                title={`${frameLabel} app`}
                src={hostedSrc}
                className="host-frame"
                allow="clipboard-write"
              />
            ) : (
              <div className="host-empty">
                <h2>{activeTabConfig?.label ?? 'App'} URL not configured</h2>
                <p>Set NEXT_PUBLIC_*_APP_URL variables in this app to host the migrated tabs.</p>
              </div>
            )}
          </section>
        </div>
        <TabNav active={activeTab} tabs={tabs} onChange={handleTabChange} onThumbButtonClick={handleThumb} thumbIcon={thumbIcon} />
      </div>
    </main>
  );
}
