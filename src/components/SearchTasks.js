import React from "react";

// SearchTasks handles the task-specific search box and filter pills.  It is
// rendered only on the tasks tab so there is no need for any "showSearch"
// flag; consumers simply mount/unmount the component as appropriate.
//
// Props:
//   searchQuery: current text value
//   onSearchChange: handler(text)
//   filters: array of filter keys (completed, overdue, starred, upcoming, ...)
//   onToggleFilter: handler(type) — toggles the given filter in parent state
//   availableFilters?: array<string>  — override list of filters to render;
//        if undefined we default to task-specific options, if an empty array the
//        filter icon is hidden entirely.
//   placeholder?: string — input placeholder text
export default function SearchTasks({
  searchQuery = "",
  onSearchChange = () => {},
  filters = [],
  onToggleFilter = () => {},
  availableFilters,
  placeholder = "Search tasks…",
}) {
  const [filterOpen, setFilterOpen] = React.useState(false);
  const filterIconRef = React.useRef(null);

  const handleSelect = (type) => {
    onToggleFilter(type);
    setFilterOpen(false);
  };

  const clearOne = (type) => {
    onToggleFilter(type);
  };

  const defaultOptions = ["completed", "overdue"];
  const filterOptions =
    Array.isArray(availableFilters) && availableFilters.length > 0
      ? availableFilters
      : availableFilters === undefined
      ? defaultOptions
      : [];

  const labelFor = (type) => {
    switch (type) {
      case "completed":
        return "Completed";
      case "overdue":
        return "Overdue";
      case "starred":
        return "Starred";
      case "upcoming":
        return "Upcoming";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const popupStyle = {
    right: "12px",
    left: "auto",
  };

  return (
    <div className="search-tasks">
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
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={placeholder}
          />
          {filterOptions.length > 0 && (
            <span
              className="material-icons filter-icon"
              aria-hidden="true"
              onClick={() => setFilterOpen((f) => !f)}
              data-testid="filter-button"
              ref={filterIconRef}
            >
              filter_list
            </span>
          )}

          {filterOpen && filterOptions.length > 0 && (
            <div
              className="filter-popup"
              data-testid="filter-popup"
              style={popupStyle}
            >
              {filterOptions.map((type) => (
                <div
                  key={type}
                  className={`filter-pill ${type}`}
                  onClick={() => handleSelect(type)}
                >
                  {labelFor(type)}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* active filters are positioned relative to the search container so they
            float directly below the search box rather than somewhere else in the
            document. */}
        {filters.length > 0 && (
          <div className="active-filters">
            {filters.map((f) => (
              <span key={f} className={`active-filter ${f}`}>
                {labelFor(f)} {" "}
                <span className="clear-filter" onClick={() => clearOne(f)}>
                  ×
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
