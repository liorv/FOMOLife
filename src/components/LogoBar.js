import React from "react";

// A simple horizontal bar that sits at the top of the app and contains the
// FOMO logo plus, optionally, a search field.  It is kept dumb so the
// parent manages the query state and decides when the search box should be
// shown (currently only on the tasks view).
export default function LogoBar({
  searchQuery = "",
  onSearchChange = () => {},
  showSearch = false,
  logoUrl = "/assets/logo_fomo.png",
  // filters is an array of strings: any of 'completed'|'overdue'
  filters = [],
  onToggleFilter = () => {},
}) {
  const [filterOpen, setFilterOpen] = React.useState(false);

  const handleSelect = (type) => {
    onToggleFilter(type);
    setFilterOpen(false);
  };

  const clearOne = (type) => {
    onToggleFilter(type);
  };

  return (
    <div className="title-bar">
      <div className="left-column">
        <img src={logoUrl} alt="FOMO logo" className="title-logo" />
      </div>
      <div className="mid-column">
        <div className="mid-row top" />
        <div className="mid-row center">
          {showSearch && (
            <div className="search-container" style={{ position: "relative" }}>
              <div className="search-inner">
                <span className="material-icons search-icon" aria-hidden="true">
                  search
                </span>
                <input
                  type="text"
                  id="title-search"
                  name="search"
                  className="title-search"
                  placeholder="Search tasks…"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  aria-label="Search tasks"
                />
                <span
                  className="material-icons filter-icon"
                  aria-hidden="true"
                  onClick={() => setFilterOpen((f) => !f)}
                  data-testid="filter-button"
                >
                  filter_list
                </span>

                {filterOpen && (
                  <div className="filter-popup" data-testid="filter-popup">
                    <div
                      className="filter-pill completed"
                      onClick={() => handleSelect("completed")}
                    >
                      Completed
                    </div>
                    <div
                      className="filter-pill overdue"
                      onClick={() => handleSelect("overdue")}
                    >
                      Overdue
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="mid-row bottom">
          {filters.length > 0 && (
            <div className="active-filters">
              {filters.map((f) => (
                <span key={f} className={`active-filter ${f}`}>
                  {f === "completed" ? "Completed" : "Overdue"}{" "}
                  <span className="clear-filter" onClick={() => clearOne(f)}>
                    &times;
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="right-column" />
    </div>
  );
}
