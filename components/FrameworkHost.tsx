'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LogoBar, TabNav } from '@myorg/ui';
import { getFrameworkTabLinks, normalizeTab, type FrameworkTab } from '../lib/frameworkConfig';
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
      router.replace('/login');
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

  const renderComponent = (tab: typeof activeTabConfig) => {
    if (!tab) return null;
    const isActive = tab.key === activeTab;
    const style: React.CSSProperties = {
      display: isActive ? 'flex' : 'none',
      flexDirection: 'column',
      width: '100%',
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
    };

    if (tab.key === 'tasks') {
      return <HomePage key="home" style={style} searchQuery={searchDraft} />;
    }
    if (tab.key === 'projects') {
      return <ProjectsPage key="projects" canManage={true} style={style} />;
    }
    if (tab.key === 'people') {
      return <ContactsPage key="contacts" canManage={true} currentUserId={userId} currentUserEmail={userEmail ?? ""} style={style} />;
    }
    if (tab.key === 'feedback') {
      return <FeedbackPage key="feedback" userId={userId} userName={userName} style={style} />;
    }
    return null;
  };

  const handleThumbClick = () => {
    try {
      if (activeTab === 'people') {
        window.dispatchEvent(new CustomEvent('framework-action-add-contact'));
      } else if (activeTab === 'projects') {
        window.dispatchEvent(new CustomEvent('framework-action-add-project'));
      } else if (activeTab === 'tasks') {
        window.dispatchEvent(new CustomEvent('framework-action-add-task'));
      } else {
        window.dispatchEvent(new CustomEvent('open-project-assistant'));
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <main className="main-layout">
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
      {tabs.map(tab => renderComponent(tab))}
      <TabNav active={activeTab} tabs={tabs} onChange={handleTabChange} className="tabnav-bottom" onThumbClick={handleThumbClick} />
      <FrameworkColorPickerOverlay colors={COLOR_PICKER_COLORS} />
    </main>
  );
}
