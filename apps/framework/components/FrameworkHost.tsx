'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LogoBar, TabNav } from '@myorg/ui';
import { getFrameworkTabLinks, normalizeTab, type FrameworkTab } from '../lib/frameworkConfig';
import FrameworkColorPickerOverlay from './ColorPickerOverlay';

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

  // Track loaded apps
  const [loadedApps, setLoadedApps] = useState<Set<string>>(new Set());
  const [aboutInfo, setAboutInfo] = useState<{ versions: Record<string, string>; dbSource: string }>({ versions: {}, dbSource: 'Loading...' });
  const [searchPlaceholder, setSearchPlaceholder] = useState<string | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [colorPickerSender, setColorPickerSender] = useState<Window | null>(null);
  const colorPickerSenderRef = useRef<Window | null>(null);
  const colorPickerSenderTabRef = useRef<string | null>(null);
  const colorPickerItemIdRef = useRef<string | null>(null);
  const colorPickerItemTypeRef = useRef<'project' | 'subproject' | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlaySelectedColor, setOverlaySelectedColor] = useState<string | undefined>(undefined);

  // Check screen size for responsive placeholder
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 480);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Periodically log collected thumb-config counts in dev mode
  useEffect(() => {
    if (!devMode) return;
    const id = setInterval(() => {
      const counts = Array.from(msgCountsRef.current.entries());
      if (counts.length === 0) return;
      counts.sort((a, b) => b[1] - a[1]);
      console.debug('[FrameworkHost] thumb-config counts (top)', counts.slice(0, 10));
      msgCountsRef.current.clear();
    }, MSG_LOG_INTERVAL);
    return () => clearInterval(id);
  }, [devMode]);

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

    // Send search query to the embedded app
    const win = iframeRefs.current.get(activeTab)?.contentWindow;
    if (win) {
      try {
        win.postMessage({ type: 'search-query', query: value }, '*');
      } catch (err) {
        // ignore
      }
    }
  };

  const getHostedSrc = (tab: typeof activeTabConfig) => {
    const href = tab?.href;
    if (!href) return undefined;

    const queryParts = ['embedded=1'];
    if (userId.trim()) {
      queryParts.push(`uid=${encodeURIComponent(userId)}`);
    }
    if (userEmail && userEmail.trim()) {
      queryParts.push(`userEmail=${encodeURIComponent(userEmail)}`);
    }
    // Removed 'q' param to prevent iframe reloads on search changes

    const base = href.split('#')[0] ?? href;
    const separator = base.includes('?') ? '&' : '?';
    return `${href}${separator}${queryParts.join('&')}`;
  };

  const frameKey = activeTabConfig?.key ?? activeTab;
  const iframeRefs = useRef<Map<string, HTMLIFrameElement | null>>(new Map());
  const [appConfigs, setAppConfigs] = useState<Map<string, { icon: string; action: string }>>(new Map());
  // Diagnostic counters (dev-mode): count `thumb-config` messages per origin
  const msgCountsRef = useRef<Map<string, number>>(new Map());
  const MSG_LOG_INTERVAL = 5000; // ms

  const isCurrentTabLoaded = loadedApps.has(activeTab);
  const config = appConfigs.get(activeTab) || { icon: '', action: 'thumb-fab' };
  const effectiveThumbIcon = isCurrentTabLoaded ? config.icon : 'refresh';
  const effectiveThumbClass = isCurrentTabLoaded ? '' : 'ui-icon--spin';
  const isSearchDisabled = !isCurrentTabLoaded;

  const handleThumb = () => {
    try {
      const win = iframeRefs.current.get(activeTab)?.contentWindow;
      if (win) {
        // send whichever action the app registered (defaults to thumb-fab)
        win.postMessage({ type: config.action }, '*');
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

  const getTabFromSource = (source: MessageEventSource | null): string | undefined => {
    for (const [tab, iframe] of iframeRefs.current.entries()) {
      if (iframe?.contentWindow === source) {
        return tab;
      }
    }
    return undefined;
  };

  // Generic action handlers registry for thumb-config actions.
  // Register new actions here to keep `message` handling extensible.
  const actionHandlers = useMemo(() => ({
    'open-colorpicker': (data: any, sender: Window, senderTab: string) => {
      const itemId = data.itemId || null;
      const itemType = data.itemType === 'subproject' ? 'subproject' : 'project';
      setColorPickerSender(sender);
      colorPickerSenderRef.current = sender;
      colorPickerSenderTabRef.current = senderTab || null;
      colorPickerItemIdRef.current = itemId;
      colorPickerItemTypeRef.current = itemType;
      setOverlaySelectedColor(typeof data.selectedColor === 'string' ? data.selectedColor : undefined);
      setOverlayOpen(true);
    },
  }), [] as any);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event?.data) return;
      // Ignore messages that originated from this window to avoid echo loops
      if (event.source === window) return;
      const { type, icon, action, appId, color, projectId, subprojectId } = event.data as {
        type?: string;
        icon?: unknown;
        action?: unknown;
        appId?: string;
        color?: string;
        projectId?: string;
        subprojectId?: string;
      };
      const senderTab = getTabFromSource(event.source) || activeTab;
      // Trace incoming messages (avoid logging event.source/window)
      console.debug('[FrameworkHost] incoming message', { type, senderTab, origin: event.origin });
      // Dev-mode diagnostic: count thumb-config messages per origin so we can
      // detect noisy apps without suppressing logs.
      if (devMode && type === 'thumb-config') {
        const key = event.origin || senderTab || 'unknown';
        const prev = msgCountsRef.current.get(key) || 0;
        msgCountsRef.current.set(key, prev + 1);
      }
      
      // NOTE: color selection from the overlay will be handled via the
      // `onSelect` prop passed to the overlay. We no longer expect the
      // overlay to post a `color-selected` message to window; instead the
      // host will forward selected colors directly to the originating iframe.
      
      if (!senderTab) return; // Ignore messages from unknown sources for other message types

      

      if (type === 'thumb-icon' && typeof icon === 'string') {
        setAppConfigs(prev => new Map(prev).set(senderTab, { ...prev.get(senderTab)!, icon }));
      } else if (type === 'thumb-config') {
        let resolvedIcon = '';
        if (typeof icon === 'string') {
          // if the icon is a path (starts with /) we should fetch it from the
          // sender's origin so that assets hosted by other apps resolve
          resolvedIcon = icon.startsWith('/') && event.origin ? `${event.origin}${icon}` : icon;
        }
        const newAction = typeof action === 'string' ? action : 'thumb-fab';
        console.debug('[FrameworkHost] thumb-config', { senderTab, icon: resolvedIcon, action: newAction });
        setAppConfigs(prev => new Map(prev).set(senderTab, { icon: resolvedIcon, action: newAction }));
        // mark sender tab as loaded so thumb config is active in tests
        setLoadedApps(prev => prev.has(senderTab) ? prev : new Set(prev).add(senderTab));
        // Route action to registered handler if present
        const handler = (actionHandlers as any)[newAction];
        if (typeof handler === 'function') {
          console.debug('[FrameworkHost] invoking action handler', { action: newAction, senderTab });
          try {
            handler(event.data, event.source as Window, senderTab);
          } catch (err) {
            console.warn('FrameworkHost action handler failed for', newAction, err);
          }
        }
      } else if (type === 'search-config') {
        const { placeholder } = event.data as { placeholder?: string };
        if (typeof placeholder === 'string') {
          setSearchPlaceholder(placeholder);
        } else if (placeholder === null) {
          setSearchPlaceholder(null); // Reset to default
        }
      } else if (type === 'app-loaded' && typeof appId === 'string') {
        console.debug('[FrameworkHost] app-loaded', { appId, senderTab });
        setLoadedApps(prev => prev.has(appId) ? prev : new Set(prev).add(appId));
        // Acknowledge the message
        try {
          if (event.source && typeof event.source === 'object' && 'postMessage' in event.source) {
            (event.source as Window).postMessage({ type: 'app-loaded-ack', appId }, '*');
          }
        } catch (err) {
          // ignore
        }
      } else if (type === 'colorpicker-open') {
        // Store the sender so we can send the color back to them and open
        // the overlay via React state rather than rebroadcasting the
        // message on `window` (which caused echo loops).
        const itemId = projectId || subprojectId;
        const itemType = projectId ? 'project' : 'subproject';
        const sender = event.source as Window;
        // Received colorpicker-open from iframe
        setColorPickerSender(sender);
        colorPickerSenderRef.current = sender;
        colorPickerSenderTabRef.current = senderTab || null;
        colorPickerItemIdRef.current = itemId || null;
        colorPickerItemTypeRef.current = itemType;
        // Open overlay via state; include any provided selectedColor for UX
        const sc = typeof (event.data as any).selectedColor === 'string' ? (event.data as any).selectedColor : undefined;
        console.debug('[FrameworkHost] opening overlay', { senderTab, itemId, itemType, selectedColor: sc });
        setOverlaySelectedColor(sc);
        setOverlayOpen(true);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Forward selected color from overlay to the originating iframe and clear sender
  const handleOverlaySelect = (color: string) => {
    const message: any = { type: 'color-selected', color };
    if (colorPickerItemTypeRef.current === 'project') {
      message.projectId = colorPickerItemIdRef.current;
    } else if (colorPickerItemTypeRef.current === 'subproject') {
      message.subprojectId = colorPickerItemIdRef.current;
    }

    // Prefer posting to the iframe's contentWindow (stable reference), fall back to saved sender window
    const targetTab = colorPickerSenderTabRef.current;
    const iframeWin = targetTab ? iframeRefs.current.get(targetTab)?.contentWindow : null;
    const target = iframeWin || colorPickerSenderRef.current;
    console.debug('[FrameworkHost] forwarding color-selected', { targetTab, hasIframe: !!iframeWin, hasSenderRef: !!colorPickerSenderRef.current, message });
    if (!target) {
      console.warn('[FrameworkHost] no target available to forward color-selected', { targetTab, senderRef: !!colorPickerSenderRef.current });
    } else {
      try {
        (target as any).postMessage(message, '*');
      } catch (err) {
        console.warn('Failed to send color selection to app:', err);
      }
    }

    setColorPickerSender(null);
    colorPickerSenderRef.current = null;
    colorPickerSenderTabRef.current = null;
    colorPickerItemIdRef.current = null;
    colorPickerItemTypeRef.current = null;
    setOverlayOpen(false);
    setOverlaySelectedColor(undefined);
  };

  // when an app becomes loaded, request its thumb config and send initial search query
  useEffect(() => {
    if (loadedApps.has(activeTab)) {
      const win = iframeRefs.current.get(activeTab)?.contentWindow;
      if (win) {
        try {
          win.postMessage({ type: 'get-thumb-config' }, '*');
          // Send initial search query
          win.postMessage({ type: 'search-query', query: headerSearchQuery }, '*');
        } catch {
          // ignore
        }
      }
    }
  }, [loadedApps, activeTab, headerSearchQuery]);

  // ask embedded app what it wants the thumb button to do, but only if it's loaded
  useEffect(() => {
    if (loadedApps.has(activeTab)) {
      const win = iframeRefs.current.get(activeTab)?.contentWindow;
      if (win) {
        try {
          win.postMessage({ type: 'get-thumb-config' }, '*');
        } catch {
          // ignore
        }
      }
    }
  }, [loadedApps, activeTab]);

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

  const setIframeRef = (tabKey: string) => (el: HTMLIFrameElement | null) => {
    iframeRefs.current.set(tabKey, el);
  };

  const handleDevSwitchUsers = async (switchId: string) => {
    document.cookie = `framework_dev_user=${encodeURIComponent(switchId)}; path=/`;
    window.location.reload();
  };

  const renderIframe = (tab: typeof activeTabConfig) => {
    if (!tab) return null;
    const src = getHostedSrc(tab);
    if (!src) return null;

    const isActive = tab.key === activeTab;
    return (
      <iframe
        key={tab.key}
        ref={setIframeRef(tab.key)}
        title={`${tab.label} app`}
        src={src}
        className="host-frame"
        allow="clipboard-write"
        style={{
          display: isActive ? 'block' : 'none',
          width: '100%',
          height: '100%',
          border: 'none',
          background: '#fff'
        }}
      />
    );
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
        {...(aboutInfo ? { aboutInfo } : {})}
      />
      <div className="app-outer">
        <div className="container framework-container">
          <section className="host-pane" aria-label="Hosted app content">
            <div className="frame-container">
              {tabs.map(tab => renderIframe(tab))}
            </div>
            {!tabs.some(tab => getHostedSrc(tab)) && (
              <div className="host-empty">
                <h2>Apps not configured</h2>
                <p>Set NEXT_PUBLIC_*_APP_URL variables in this app to host the migrated tabs.</p>
              </div>
            )}
          </section>
        </div>
        <TabNav active={activeTab} tabs={tabs} onChange={handleTabChange} onThumbButtonClick={handleThumb} thumbIcon={effectiveThumbIcon} thumbIconClassName={effectiveThumbClass} />
      </div>
      <FrameworkColorPickerOverlay
        colors={COLOR_PICKER_COLORS}
        open={overlayOpen}
        selectedColor={overlaySelectedColor ?? ''}
        onSelect={handleOverlaySelect}
        onClose={() => {
          setOverlayOpen(false);
          setOverlaySelectedColor(undefined);
        }}
      />
    </main>
  );
}
