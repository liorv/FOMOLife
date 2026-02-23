import React from "react";

// A simple horizontal bar that sits at the top of the app and contains the
// FOMO logo plus, optionally, a search field.  It is kept dumb so the
// parent manages the query state and decides when the search box should be
// shown (currently only on the tasks view).
export default function LogoBar({
  logoUrl = "/assets/logo_fomo.png",
  title, // when provided, show instead of logo/search
  onBack, // invoked when back button is pressed
  children,
}) {
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
            <span className="bar-title">
              {title}
              {onBack && (
                <button
                  className="back-circle"
                  onClick={onBack}
                  title="Back"
                >
                  <span className="material-icons">arrow_back</span>
                </button>
              )}
            </span>
          ) : (
            children
          )}
        </div>
        <div className="mid-row bottom" />
      </div>
      <div className="right-column" />
    </div>
  );
}
