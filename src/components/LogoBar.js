import React from 'react';

// A simple horizontal bar that sits at the top of the app and contains the
// FOMO logo plus, optionally, a search field.  It is kept dumb so the
// parent manages the query state and decides when the search box should be
// shown (currently only on the tasks view).
export default function LogoBar({
  searchQuery = '',
  onSearchChange = () => {},
  showSearch = false,
  logoUrl = '/assets/logo_fomo.png',
}) {
  return (
    <div className="title-bar">
      <img src={logoUrl} alt="FOMO logo" className="title-logo" />
      {showSearch && (
        <div className="search-container">
          <span className="material-icons search-icon" aria-hidden="true">
            search
          </span>
          <input
            type="text"
            className="title-search"
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            aria-label="Search tasks"
          />
        </div>
      )}
    </div>
  );
}
