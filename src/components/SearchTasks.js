import React from "react";

// SearchTasks handles the task-specific search box and filter pills.  It is
// rendered only on the tasks tab so there is no need for any "showSearch"
// flag; consumers simply mount/unmount the component as appropriate.
//
// Props:
//   searchQuery: current text value
//   onSearchChange: handler(text)
//   filters: array of "completed"|"overdue"
//   onToggleFilter: handler(type) — toggles the given filter in parent state
export default function SearchTasks({
  searchQuery = "",
  onSearchChange = () => {},
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
  );
}
