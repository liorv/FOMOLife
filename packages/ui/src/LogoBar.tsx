'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export interface LogoBarProps {
  logoUrl?: string;
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  searchDisabled?: boolean;
  onSearchChange?: (value: string) => void;
  userName?: string;
  userEmail?: string;
  userInitials?: string;
  userAvatarUrl?: string;
  canSignOut?: boolean;
  onSoftLogout?: () => void;
  onSwitchUsers?: () => void;
  devMode?: boolean;
  devCurrentUserId?: string;
  devDefaultUserId?: string;
  onDevSwitchUsers?: (userId: string) => void;
  aboutInfo?: {
    versions: Record<string, string>;
    dbSource: string;
  };
  className?: string;
}

export default function LogoBar({
  logoUrl = '/assets/logo_fomo.png',
  showSearch = false,
  searchValue = '',
  searchPlaceholder = 'Search',
  searchDisabled = false,
  onSearchChange,
  userName = 'User',
  userEmail = '',
  userInitials = 'U',
  userAvatarUrl = '',
  canSignOut = false,
  onSoftLogout,
  onSwitchUsers,
  devMode = false,
  devCurrentUserId = '',
  devDefaultUserId = '',
  onDevSwitchUsers,
  aboutInfo,
  className,
}: LogoBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [devSwitchId, setDevSwitchId] = useState(devCurrentUserId);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);

    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [menuOpen]);

  return (
    <header className={`title-bar${className ? ` ${className}` : ''}`}>
      <div className="left-column">
        <Image src={logoUrl} alt="FOMO logo" className="title-logo" width={168} height={48} priority />
      </div>
      <div className="mid-column">
        <div className="mid-row" />
        <div className="mid-row center">
          {showSearch ? (
            <div className="logo-search-wrap">
              <span className="material-icons logo-search-icon" aria-hidden="true">
                search
              </span>
              <input
                className="logo-search-input"
                name="logo-search"
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                disabled={searchDisabled}
              />
            </div>
          ) : null}
        </div>
        <div className="mid-row" />
      </div>
      <div className="right-column">
        {/* Always show avatar button; only present menu items when actions are available */}
        <div className="logobar-user" ref={menuRef} title={userEmail || userName}>
          <button
            type="button"
            className="logobar-avatar-btn"
            aria-label={
              onSoftLogout || onSwitchUsers
                ? 'Open account menu'
                : 'User account'
            }
            aria-haspopup={onSoftLogout || onSwitchUsers ? 'menu' : undefined}
            aria-expanded={onSoftLogout || onSwitchUsers ? menuOpen : undefined}
            onClick={() => {
              if (onSoftLogout || onSwitchUsers) {
                setMenuOpen((value) => !value);
              }
            }}
          >
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt={userName || 'User'}
                className="logobar-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="logobar-avatar logobar-avatar--initials">
                {userInitials}
              </span>
            )}
          </button>

          {(menuOpen && (onSoftLogout || onSwitchUsers)) ? (
            <div className="logobar-menu" role="menu" aria-label="Account menu">
              <div className="logobar-menu-header">
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt={userName || 'User'}
                    className="logobar-menu-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="logobar-menu-avatar logobar-avatar--initials">
                    {userInitials}
                  </span>
                )}
                <div className="logobar-menu-identity">
                  <div className="logobar-menu-name">{userName}</div>
                  {userEmail ? <div className="logobar-menu-email">{userEmail}</div> : null}
                </div>
              </div>
              <div className="logobar-menu-divider" />
              {aboutInfo ? (
                <button
                  type="button"
                  className="logobar-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setAboutOpen(true);
                  }}
                >
                  <span className="material-icons logobar-menu-item-icon" aria-hidden="true">
                    info
                  </span>
                  About
                </button>
              ) : null}
              {onSoftLogout ? (
                <button
                  type="button"
                  className="logobar-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSoftLogout?.();
                  }}
                >
                  <span className="material-icons logobar-menu-item-icon" aria-hidden="true">
                    logout
                  </span>
                  Logout
                </button>
              ) : null}
              {devMode ? (
                <div className="logobar-menu-item" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Switch user:
                    <input
                      style={{ width: '120px' }}
                      value={devSwitchId}
                      onChange={(e) => setDevSwitchId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setMenuOpen(false);
                          onDevSwitchUsers?.(devSwitchId);
                        }
                      }}
                    />
                    <button
                      type="button"
                      style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}
                      onClick={() => {
                        setMenuOpen(false);
                        onDevSwitchUsers?.(devSwitchId);
                      }}
                    >
                      OK
                    </button>
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    (default: {devDefaultUserId})
                  </span>
                </div>
              ) : onSwitchUsers ? (
                <button
                  type="button"
                  className="logobar-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSwitchUsers?.();
                  }}
                >
                  <span className="material-icons logobar-menu-item-icon" aria-hidden="true">
                    switch_account
                  </span>
                  Switch users
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {aboutOpen && aboutInfo ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
          }}
          onClick={() => setAboutOpen(false)}
        >
          <div
            style={{
              width: 'min(92vw, 320px)',
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>About FOMO Life</h3>
            <div style={{ marginBottom: '16px' }}>
              <strong>Versions:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {Object.keys(aboutInfo.versions).length === 0 ? (
                  <li>Loading...</li>
                ) : (
                  Object.entries(aboutInfo.versions).map(([app, version]) => (
                    <li key={app}>{app}: {version}</li>
                  ))
                )}
              </ul>
            </div>
            <div>
              <strong>Database Source:</strong> {aboutInfo.dbSource}
            </div>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button type="button" onClick={() => setAboutOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}