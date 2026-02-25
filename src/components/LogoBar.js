import React from "react";

/**
 * Horizontal bar at the top — logo, optional project title, and search slot.
 *
 * Optional auth props:
 *   user       – Supabase User object; when provided a small avatar / email
 *                chip is rendered in the right column.
 *   onSignOut  – called when the user clicks the sign-out button.
 */
export default function LogoBar({
  logoUrl = "/assets/logo_fomo.png",
  title, // when provided, show instead of logo/search
  onBack, // invoked when back button is pressed
  onLogoClick, // invoked when logo is clicked (e.g. act as back nav)
  onTitleChange, // optional callback when title is edited inline
  user, // authenticated Supabase user (optional)
  onSignOut, // sign-out callback (optional)
  children,
}) {
  // Derive a short display name from the user's identity
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
    if (onTitleChange) {
      setEditing(true);
    }
  };

  return (
    <div className="title-bar">
      <div className="left-column">
        {/* logo always shown, even when a title is present */}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") finishEdit();
                  }}
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
            <span className="material-icons" style={{ fontSize: '48px' }}>
              close
            </span>
          </button>
        )}
        {user && onSignOut && !onBack && (
          <div className="logobar-user" title={user.email}>
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
            <button
              className="logobar-signout-btn"
              onClick={onSignOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <span className="material-icons" style={{ fontSize: '20px' }}>logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
