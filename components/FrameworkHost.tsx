'use client';

import { useMemo, useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LogoBar, TabNav } from '@myorg/ui';
import { getFrameworkTabLinks, normalizeTab, TAB_ORDER, type FrameworkTab } from '../lib/frameworkConfig';
import FrameworkColorPickerOverlay from './ColorPickerOverlay';
import { NotificationBell } from './NotificationBell';
import HomePage from './HomePage';
import ProjectsPage from './projects/ProjectsPage';
import ContactsPage from './contacts/ContactsPage';
import FeedbackPage from './FeedbackPage';

// Module-level: which tabs have finished their first data load this browser session.
// Persists across React re-renders and soft navigations (not across hard page reloads).
const _sessionReadyTabs = new Set<FrameworkTab>();
// Flips to true once the initial active tab has loaded. After that the progress
// bar is never shown again — not on tab switches, not on re-visits.
// Initialised from sessionStorage: if any tab cache already exists the user has
// visited before, so we skip the boot overlay entirely.
let _pageHasLoaded: boolean = (() => {
  if (typeof window === 'undefined') return false;
  try {
    return (
      sessionStorage.getItem('fomo:tasksCache') !== null ||
      sessionStorage.getItem('fomo:projectsCache') !== null ||
      sessionStorage.getItem('fomo:contactsCache') !== null ||
      sessionStorage.getItem('fomo:feedbackCache') !== null
    );
  } catch {
    return false;
  }
})();

// ─── Tab Loading Progress Bar ─────────────────────────────────────────────────
function TabProgressBar({ loading }: { loading: boolean }) {
  const [visible, setVisible] = useState(loading);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      setDone(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else if (visible) {
      setDone(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setDone(false);
      }, 600);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (!visible) return null;
  return (
    <div className={`cyb-boot-overlay${done ? ' cyb-boot-overlay--done' : ''}`} aria-hidden="true">
      {/* scanline overlay */}
      <div className="cyb-scanlines" />
      {/* corner brackets */}
      <div className="cyb-corner cyb-corner--tl" />
      <div className="cyb-corner cyb-corner--tr" />
      <div className="cyb-corner cyb-corner--bl" />
      <div className="cyb-corner cyb-corner--br" />
      {/* center logo / spinner */}
      <div className="cyb-center">
        <div className="cyb-hex-ring">
          <div className="cyb-hex-ring__inner" />
        </div>
        <div className="cyb-status-text">INITIALIZING<span className="cyb-blink">_</span></div>
      </div>
      {/* bottom progress bar */}
      <div className="cyb-bar-wrap">
        <div className="cyb-bar" />
      </div>
    </div>
  );
}

const COLOR_PICKER_COLORS = [
  "#D32F2F", // dark red
  "#0D47A1", // dark blue
  "#1976D2", // medium blue
  "#3F51B5", // indigo
  "#2196F3", // blue
  "#455A64", // blue grey dark
  "#607D8B", // blue grey
  "#9E9E9E", // grey
  "#424242", // dark grey
  "#FFC107", // amber (gold)
  "#FFA000", // dark amber
  "#FF8F00", // darker gold
  "#795548", // brown (dark)
  "#7B1FA2", // dark purple
  "#00796B", // dark teal
  "#F57F17", // dark orange
];

type FrameworkHostProps = {
  appName?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userInitials: string;
  userAvatarUrl?: string;
  canSignOut: boolean;
  devMode?: boolean;
  defaultUserId?: string;
};

export default function FrameworkHost({ appName: _appName, userId, userName, userEmail, userInitials, userAvatarUrl, canSignOut, devMode = false, defaultUserId = '' }: FrameworkHostProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // activeTab is local state for instant tab switching (no server round-trip).
  // It is initialised from the URL and stays in sync via the effect below.
  const [activeTab, setActiveTab] = useState<FrameworkTab>(() =>
    normalizeTab(searchParams.get('tab') ?? undefined)
  );

  // Sync activeTab if the URL changes externally (back/forward, direct link).
  useEffect(() => {
    const tabFromUrl = normalizeTab(searchParams.get('tab') ?? undefined);
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  // Listen for external tab-switch requests (e.g. from notification bell "Jump to thread")
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab as string | undefined;
      if (tab) handleTabChange(tab as FrameworkTab);
    };
    window.addEventListener('framework-navigate-tab', handler);
    return () => window.removeEventListener('framework-navigate-tab', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = useMemo(() => getFrameworkTabLinks(), []);
  const activeTabConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const showHeaderSearch = activeTab === 'tasks' || activeTab === 'projects' || activeTab === 'people' || activeTab === 'feedback';
  const headerSearchQuery = searchParams.get('q') ?? '';

  // Local draft keeps the input controlled by React state (not URL) so focus
  // is never lost on keystrokes. The URL is updated after a short debounce.
  const [searchDraft, setSearchDraft] = useState(headerSearchQuery);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync draft when the URL param changes externally (e.g. tab switch clears it)
  useEffect(() => {
    setSearchDraft(headerSearchQuery);
  }, [headerSearchQuery]);

// Pre-mount ALL tabs immediately so data fetches begin in the background.
  const [loadedApps] = useState<Set<string>>(() => new Set(TAB_ORDER));

  // The tab that was active when the page first loaded.
  const initialTabRef = useRef<FrameworkTab>(normalizeTab(searchParams.get('tab') ?? undefined));

  // Show the progress bar only during the very first page load, for the initial tab.
  // Once _pageHasLoaded flips true it stays true for the lifetime of the module.
  const [pageLoading, setPageLoading] = useState<boolean>(true);

  // Sync state after hydration to check sessionStorage without mismatch
  useLayoutEffect(() => {
    // If the cache indicates we've been here, or the tab is already marked ready
    const hasCache = _pageHasLoaded;
    if (hasCache || _sessionReadyTabs.has(initialTabRef.current)) {
      setPageLoading(false);
    }
  }, []);

  const handleTabReady = useCallback((tab: FrameworkTab) => {
    _sessionReadyTabs.add(tab);
    // Only the initial tab's readiness clears the progress bar.
    if (!_pageHasLoaded && tab === initialTabRef.current) {
      _pageHasLoaded = true;
      setPageLoading(false);
    }
  }, []);
  const [aboutInfo, setAboutInfo] = useState<{ versions: Record<string, string>; dbSource: string }>({ versions: {}, dbSource: 'Loading...' });
  const [searchPlaceholder, setSearchPlaceholder] = useState<string | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // PWA install prompt — only shown in browser (not standalone)
  const [installPrompt, setInstallPrompt] = useState<{ prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [isStandalone, setIsStandalone] = useState(true); // assume standalone until we check
  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as any);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const handleInstall = installPrompt && !isStandalone ? async () => {
    await (installPrompt as any).prompt();
    setInstallPrompt(null);
  } : undefined;
  

  // Check screen size for responsive placeholder
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 480);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const defaultSearchPlaceholder = isSmallScreen ? 'Search' : (activeTab === 'tasks' ? 'Search everything' : activeTab === 'people' ? 'Search contacts' : activeTab === 'feedback' ? 'Search requests' : 'Search projects');
  const effectiveSearchPlaceholder = searchPlaceholder ?? defaultSearchPlaceholder;

  const handleTabChange = (tab: FrameworkTab) => {
    // Update local state immediately so the UI switches without waiting for the server.
    setActiveTab(tab);
    if (tab === 'projects') {
      setSearchDraft('');
    }
    // Also update the URL (for deep-linking and browser back/forward).
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', tab);
    if (tab === 'projects') {
      nextParams.delete('q');
    }
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  const handleHeaderSearchChange = (value: string) => {
    // Update local state immediately so the input stays focused
    setSearchDraft(value);

    // Debounce the URL write so rapid keystrokes don't each trigger a re-render
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        nextParams.set('q', value);
      } else {
        nextParams.delete('q');
      }
      router.replace(`${pathname}?${nextParams.toString()}`);
    }, 300);
  };

  const isCurrentTabLoaded = true;
  const isSearchDisabled = !isCurrentTabLoaded;

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
      router.replace('/login?loggedOut=1');
    }
  };

  

  // Forward selected color from overlay to the originating iframe and clear sender
  

  // Reset search placeholder when tab changes
  useEffect(() => {
    setSearchPlaceholder(null);
  }, [activeTab]);

  // Fetch about info
  useEffect(() => {
    fetch('/api/about')
      .then(res => res.json())
      .then(setAboutInfo)
      .catch(err => {
        console.error('Failed to fetch about info:', err);
        setAboutInfo({ versions: {}, dbSource: 'Error loading data' });
      });
  }, []);

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

  const handleDevSwitchUsers = async (switchId: string) => {
    document.cookie = `framework_dev_user=${encodeURIComponent(switchId)}; path=/`;
    window.location.reload();
  };

  // Swipe-to-navigate between tabs on mobile
  const swipeTouchStart = useRef<{ x: number; y: number } | null>(null);
  const [swipeAnim, setSwipeAnim] = useState<{ dir: 'left' | 'right'; from: FrameworkTab; to: FrameworkTab } | null>(null);
  const animClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    swipeTouchStart.current = { x: t.clientX, y: t.clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeTouchStart.current) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - swipeTouchStart.current.x;
    const dy = t.clientY - swipeTouchStart.current.y;
    swipeTouchStart.current = null;
    // Only act on predominantly horizontal swipes of at least 60px
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const currentIndex = TAB_ORDER.indexOf(activeTab as FrameworkTab);
    if (currentIndex === -1) return;
    // Swipe left → next tab; swipe right → previous tab
    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;
    const toTab = TAB_ORDER[nextIndex];
    if (!toTab) return;
    const dir: 'left' | 'right' = dx < 0 ? 'left' : 'right';
    setSwipeAnim({ dir, from: activeTab as FrameworkTab, to: toTab });
    if (animClearRef.current) clearTimeout(animClearRef.current);
    animClearRef.current = setTimeout(() => setSwipeAnim(null), 320);
    handleTabChange(toTab);
  }, [activeTab, handleTabChange]);

  const renderComponent = (tab: typeof activeTabConfig) => {
    if (!tab) return null;
    const isActive = tab.key === activeTab;
    const isExiting = swipeAnim?.from === tab.key;
    const isEntering = swipeAnim?.to === tab.key;
    const isVisible = (!swipeAnim && isActive) || isExiting || isEntering;

    let animClass = '';
    if (isEntering) {
      animClass = swipeAnim!.dir === 'left' ? 'tab-slide-enter-right' : 'tab-slide-enter-left';
    } else if (isExiting) {
      animClass = swipeAnim!.dir === 'left' ? 'tab-slide-exit-left' : 'tab-slide-exit-right';
    }

    const wrapperStyle: React.CSSProperties = {
      display: isVisible ? 'flex' : 'none',
      flexDirection: 'column',
      width: '100%',
      ...(animClass ? {} : { flex: 1, minHeight: 0 }),
    };

    const innerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      ...(animClass ? { height: '100%' } : {}),
    };

    let content: React.ReactNode = null;
    if (tab.key === 'tasks') {
      content = <HomePage key="home" style={innerStyle} searchQuery={searchDraft} onReady={() => handleTabReady('tasks')} isActive={isActive} />;
    } else if (tab.key === 'projects') {
      content = <ProjectsPage key="projects" canManage={true} currentUserId={userId} currentUserName={userName} currentUserAvatarUrl={userAvatarUrl ?? ''} style={innerStyle} onReady={() => handleTabReady('projects')} isActive={isActive} />;
    } else if (tab.key === 'people') {
      content = <ContactsPage key="contacts" canManage={true} currentUserId={userId} currentUserEmail={userEmail ?? ""} style={innerStyle} onReady={() => handleTabReady('people')} isActive={isActive} />;
    } else if (tab.key === 'feedback') {
      content = <FeedbackPage key="feedback" userId={userId} userName={userName} userAvatarUrl={userAvatarUrl ?? ''} style={innerStyle} onReady={() => handleTabReady('feedback')} isActive={isActive} />;
    }

    return (
      <div key={tab.key} style={wrapperStyle} className={animClass || undefined}>
        {content}
      </div>
    );
  };

  const handleThumbClick = () => {
    try {
      if (activeTab === 'people') {
        window.dispatchEvent(new CustomEvent('framework-action-add-contact'));
      } else if (activeTab === 'projects') {
        window.dispatchEvent(new CustomEvent('framework-action-add-project'));
      } else if (activeTab === 'tasks') {
        window.dispatchEvent(new CustomEvent('framework-action-add-task'));
      } else if (activeTab === 'feedback') {
        window.dispatchEvent(new CustomEvent('framework-action-add-feedback'));
      } else {
        window.dispatchEvent(new CustomEvent('open-project-assistant'));
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <main className="main-layout" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <LogoBar
        showSearch={showHeaderSearch}
        searchValue={searchDraft}
        searchPlaceholder={effectiveSearchPlaceholder}
        searchDisabled={isSearchDisabled}
        onSearchChange={handleHeaderSearchChange}
        userName={userName}
        userEmail={userEmail ?? ''}
        userInitials={userInitials}
        userAvatarUrl={userAvatarUrl ?? ''}
        canSignOut={canSignOut}
        onSoftLogout={handleSignOut}
        onSwitchUsers={handleSwitchUsers}
        devMode={devMode}
        devCurrentUserId={userId}
        devDefaultUserId={defaultUserId}
        onDevSwitchUsers={handleDevSwitchUsers}
        className="logobar-top"
        rightContent={<NotificationBell userId={userId} />}
        {...(aboutInfo ? { aboutInfo } : {})}
        {...(handleInstall ? { onInstall: handleInstall } : {})}
      />
      <div className="tab-viewport">
        <TabProgressBar loading={pageLoading} />
        {tabs.map(tab => renderComponent(tab))}
      </div>
      <TabNav active={activeTab} tabs={tabs} onChange={handleTabChange} className="tabnav-bottom" onThumbClick={handleThumbClick} />
      <FrameworkColorPickerOverlay colors={COLOR_PICKER_COLORS} />
    </main>
  );
}
