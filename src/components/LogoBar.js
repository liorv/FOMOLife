import React from "react";

/**
 * Horizontal bar at the top — logo, optional project title, and search slot.
 *
 * Optional auth props:
 *   user       – Supabase User object; when provided a Google-style avatar
 *                button is rendered in the right column. Clicking it opens
 *                a dropdown with the user's name/email and a Sign out option.
 *   onSignOut  – called when the user clicks Sign out in the dropdown.
 */
export default function LogoBar({
  logoUrl = "/assets/logo_fomo.png",
  title,
  onBack,
  onLogoClick,
  onTitleChange,
  user,
  onSignOut,
  children,
}) {
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    null;
  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;

  const [editing, setEditing] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(title || "");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  React.useEffect(() => {
    setDraftTitle(title || "");
  }, [title]);

  const finishEdit = () => {
    setEditing(false);
    if (onTitleChange && draftTitle !== title) {
      onTitleChange(draftTitle);
    }
  };

  const handleTitleClick = () => {
    if (onTitleChange) setEditing(true);
  };

  return (
    <div className="title-bar">
      <div className="left-column">
        <img
          src={logoUrl}
          alt="FOMO logo"
          className="title-logo"
          {...(onLogoClick ? { onClick: onLogoClick, style: { cursor: 'pointer' } } : {})}
        />
      </div>
      <div className="mid-column">
        <div className="mid-row top" />
        <div className="mid-row center">
          {title ? (
            <span className="bar-title" onClick={handleTitleClick}>
              {editing ? (
                <input
                  id="project-title-input"
                  className="bar-title-input"
                  name="project-title"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onBlur={finishEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") finishEdit(); }}
                  autoFocus
                />
              ) : (
                <span className="bar-title-text">{title}</span>
              )}
            </span>
          ) : (
            children
          )}
        </div>
        <div className="mid-row bottom" />
      </div>
      <div className="right-column">
        {onBack && (
          <button
            className="icon-button close-button"
            onClick={onBack}
            title="Close"
            aria-label="Close"
            style={{ padding: '12px' }}
          >
            <span className="material-icons" style={{ fontSize: '48px' }}>close</span>
          </button>
        )}
        {user && onSignOut && !onBack && (
          <div className="logobar-user" ref={menuRef}>
            {/* Avatar button */}
            <button
              className="logobar-avatar-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName || "User"}
                  className="logobar-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="logobar-avatar logobar-avatar--initials">
                  {(displayName || "?")[0].toUpperCase()}
                </span>
              )}
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="logobar-menu" role="menu">
                {/* User identity header */}
                <div className="logobar-menu-header">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName || "User"}
                      className="logobar-menu-avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="logobar-menu-avatar logobar-avatar--initials">
                      {(displayName || "?")[0].toUpperCase()}
                    </span>
                  )}
                  <div className="logobar-menu-identity">
                    {displayName && <span className="logobar-menu-name">{displayName}</span>}
                    <span className="logobar-menu-email">{user.email}</span>
                  </div>
                </div>

                <div className="logobar-menu-divider" />

                {/* Sign out */}
                <button
                  className="logobar-menu-item"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onSignOut(); }}
                >
                  <span className="material-icons logobar-menu-item-icon">logout</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
