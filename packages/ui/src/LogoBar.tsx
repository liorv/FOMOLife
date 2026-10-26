'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useUserPreferences } from './useUserPreferences';
import { SettingsModal } from './SettingsModal';

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
  className?: string;
  rightContent?: React.ReactNode;
  onInstall?: () => void;
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
  onSoftLogout,
  onSwitchUsers,
  devMode = false,
  devCurrentUserId = '',
  devDefaultUserId = '',
  onDevSwitchUsers,
  className,
  rightContent,
  onInstall,
}: LogoBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [devSwitchId, setDevSwitchId] = useState(devCurrentUserId);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [prefs, setPrefs] = useUserPreferences();

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
              {searchValue ? (
                <button
                  type="button"
                  className="logo-search-clear"
                  aria-label="Clear search"
                  onClick={() => onSearchChange?.('')}
                >
                  <span className="material-icons">close</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mid-row" />
      </div>
      <div className="right-column">
        {rightContent && (
          <div className="logobar-right-content">
            {rightContent}
          </div>
        )}
        {/* Always show avatar button; only present menu items when actions are available */}
        <div className="logobar-user" ref={menuRef} title={userEmail || userName}>
          <button
            type="button"
            className="logobar-avatar-btn"
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((value) => !value);
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

          {menuOpen ? (
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
              <button
                type="button"
                className="logobar-menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <span className="material-icons logobar-menu-item-icon" aria-hidden="true">
                  settings
                </span>
                Settings
              </button>
              {onInstall ? (
                <button
                  type="button"
                  className="logobar-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onInstall();
                  }}
                >
                  <span className="material-icons logobar-menu-item-icon" aria-hidden="true">
                    install_mobile
                  </span>
                  Install App
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
      {settingsOpen ? (
        <SettingsModal
          prefs={prefs}
          onSave={setPrefs}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </header>
  );
}