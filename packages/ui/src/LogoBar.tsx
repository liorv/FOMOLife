'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export interface LogoBarProps {
  logoUrl?: string;
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  userName?: string;
  userEmail?: string;
  userInitials?: string;
  userAvatarUrl?: string;
  canSignOut?: boolean;
  onSoftLogout?: () => void;
  onSwitchUsers?: () => void;
}

export default function LogoBar({
  logoUrl = '/assets/logo_fomo.png',
  showSearch = false,
  searchValue = '',
  searchPlaceholder = 'Search…',
  onSearchChange,
  userName = 'User',
  userEmail = '',
  userInitials = 'U',
  userAvatarUrl = '',
  canSignOut = false,
  onSoftLogout,
  onSwitchUsers,
}: LogoBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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
    <header className="title-bar">
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
              {onSwitchUsers ? (
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
    </header>
  );
}