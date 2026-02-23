import React from "react";

// A simple horizontal bar that sits at the top of the app and contains the
// FOMO logo plus, optionally, a search field.  It is kept dumb so the
// parent manages the query state and decides when the search box should be
// shown (currently only on the tasks view).
export default function LogoBar({
  logoUrl = "/assets/logo_fomo.png",
  title, // when provided, show instead of logo/search
  onBack, // invoked when back button is pressed
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

  const handleTitleClick = () => {
    if (onTitleChange) {
      setEditing(true);
    }
  };

  return (
    <div className="title-bar">
      <div className="left-column">
        {/* logo always shown, even when a title is present */}
        <img src={logoUrl} alt="FOMO logo" className="title-logo" />
      </div>
      <div className="mid-column">
        <div className="mid-row top" />
        <div className="mid-row center">
          {title ? (
            <span className="bar-title" onClick={handleTitleClick}>
              {editing ? (
                <input
                  className="bar-title-input"
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
            className="check-circle"
            onClick={onBack}
            title="Done"
          >
            <span className="material-icons">check</span>
          </button>
        )}
      </div>
    </div>
  );
}
