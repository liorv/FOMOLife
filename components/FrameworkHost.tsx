'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LogoBar, TabNav } from '@myorg/ui';
import { getFrameworkTabLinks, normalizeTab, type FrameworkTab } from '../lib/frameworkConfig';
import FrameworkColorPickerOverlay from './ColorPickerOverlay';
import { NotificationBell } from './NotificationBell';
import TasksPage from './tasks/TasksPage';
import ProjectsPage from './projects/ProjectsPage';
import ContactsPage from './contacts/ContactsPage';



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
  const showHeaderSearch = activeTab === 'tasks' || activeTab === 'projects' || activeTab === 'people';
  const headerSearchQuery = searchParams.get('q') ?? '';

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

  const defaultSearchPlaceholder = isSmallScreen ? 'Search' : (activeTab === 'tasks' ? 'Search tasks' : activeTab === 'people' ? 'Search contacts' : 'Search projects');
  const effectiveSearchPlaceholder = searchPlaceholder ?? defaultSearchPlaceholder;

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

    // removed search forward
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
    const style = { display: isActive ? 'block' : 'none', width: '100%', height: '100%', overflow: 'hidden' };

    if (tab.key === 'tasks') {
      return <div key="tasks" style={style}><TasksPage canManage={true} /></div>;
    }
    if (tab.key === 'projects') {
      return <div key="projects" style={style}><ProjectsPage canManage={true} /></div>;
    }
    if (tab.key === 'people') {
      return <div key="contacts" style={style}><ContactsPage canManage={true} currentUserId={userId} currentUserEmail={userEmail ?? ''} /></div>;
    }
    return null;
  };

  return (
    <main className="main-layout">
      <LogoBar
        showSearch={showHeaderSearch}
        searchValue={headerSearchQuery}
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
        rightContent={<NotificationBell />}
        {...(aboutInfo ? { aboutInfo } : {})}
      />
      <div className="app-outer">
        <div className="container framework-container">
          <section className="host-pane" aria-label="Hosted app content">
            <div className="frame-container">
              {tabs.map(tab => renderComponent(tab))}
            </div>
            
          </section>
        </div>
        <TabNav active={activeTab} tabs={tabs} onChange={handleTabChange} className="tabnav-bottom" />
      </div>
      
    </main>
  );
}
