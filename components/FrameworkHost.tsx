'use client';

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LogoBar, TabNav } from '@myorg/ui';
import { getFrameworkTabLinks, normalizeTab, TAB_ORDER, type FrameworkTab } from '../lib/frameworkConfig';
import FrameworkColorPickerOverlay from './ColorPickerOverlay';
import { NotificationBell } from './NotificationBell';
import HomePage from './HomePage';
import ProjectsPage from './projects/ProjectsPage';
import ContactsPage from './contacts/ContactsPage';
import FeedbackPage from './FeedbackPage';



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

  const activeTab = normalizeTab(searchParams.get('tab') ?? undefined);
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

  // Track which apps have finished loading
  const [loadedApps, setLoadedApps] = useState<Set<string>>(new Set());
  const [aboutInfo, setAboutInfo] = useState<{ versions: Record<string, string>; dbSource: string }>({ versions: {}, dbSource: 'Loading...' });
  const [searchPlaceholder, setSearchPlaceholder] = useState<string | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  

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
    if (tab === 'projects') {
      setSearchDraft('');
    }
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
    swipeTouchStart.current = { x: t.clientX, y: t.clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeTouchStart.current) return;
    const t = e.changedTouches[0];
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
      content = <HomePage key="home" style={innerStyle} searchQuery={searchDraft} />;
    } else if (tab.key === 'projects') {
      content = <ProjectsPage key="projects" canManage={true} currentUserId={userId} currentUserName={userName} currentUserAvatarUrl={userAvatarUrl ?? ''} style={innerStyle} />;
    } else if (tab.key === 'people') {
      content = <ContactsPage key="contacts" canManage={true} currentUserId={userId} currentUserEmail={userEmail ?? ""} style={innerStyle} />;
    } else if (tab.key === 'feedback') {
      content = <FeedbackPage key="feedback" userId={userId} userName={userName} style={innerStyle} />;
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
      />
      <div className="tab-viewport">
        {tabs.map(tab => renderComponent(tab))}
      </div>
      <TabNav active={activeTab} tabs={tabs} onChange={handleTabChange} className="tabnav-bottom" onThumbClick={handleThumbClick} />
      <FrameworkColorPickerOverlay colors={COLOR_PICKER_COLORS} />
    </main>
  );
}
