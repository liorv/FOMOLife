import React from "react";

// A simple horizontal bar that sits at the top of the app and contains the
// FOMO logo plus, optionally, a search field.  It is kept dumb so the
// parent manages the query state and decides when the search box should be
// shown (currently only on the tasks view).
export default function LogoBar({
  logoUrl = "/assets/logo_fomo.png",
  title, // when provided, show instead of logo/search
  onBack, // invoked when back button is pressed
  onLogoClick, // invoked when logo is clicked (e.g. act as back nav)
  onTitleChange, // optional callback when title is edited inline
  children,
}) {
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

  // previously we managed a media-query-driven flag to hide the
  // projects label at narrow widths.  the design has switched to a
  // plain close icon, so no responsive logic is needed here.

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
      </div>
    </div>
  );
}
