import React from "react";
import { Icon } from "./icon";
import "./styles.css";

/**
 * PageShell - Common page layout wrapper
 * 
 * Provides consistent header, navigation, and content structure.
 * 
 * @example
 * ```tsx
 * <PageShell 
 *   title="My App"
 *   navItems={[{ label: 'Home', href: '/' }]}
 * >
 *   <PageContent />
 * </PageShell>
 * ```
 */
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  active?: boolean;
}

export interface PageShellProps {
  /** Page title */
  title: string;
  /** Navigation items */
  navItems?: NavItem[];
  /** Optional user menu */
  userMenu?: {
    name: string;
    avatar?: string;
    onLogout?: () => void;
  };
  /** Page content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function PageShell({
  title,
  navItems = [],
  userMenu,
  children,
  className = "",
}: PageShellProps) {
  return (
    <div className={`ui-shell ${className}`}>
      <header className="ui-shell__header">
        <div className="ui-shell__brand">
          <Icon name="apps" size={24} />
          <span className="ui-shell__title">{title}</span>
        </div>
        
        {navItems.length > 0 && (
          <nav className="ui-shell__nav">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`ui-shell__nav-item ${item.active ? "ui-shell__nav-item--active" : ""}`}
              >
                {item.icon && <Icon name={item.icon} size={18} />}
                {item.label}
              </a>
            ))}
          </nav>
        )}

        {userMenu && (
          <div className="ui-shell__user">
            <span className="ui-shell__user-name">{userMenu.name}</span>
            {userMenu.onLogout && (
              <button 
                className="ui-shell__logout" 
                onClick={userMenu.onLogout}
                aria-label="Logout"
              >
                <Icon name="logout" size={18} />
              </button>
            )}
          </div>
        )}
      </header>

      <main className="ui-shell__content">
        {children}
      </main>
    </div>
  );
}
