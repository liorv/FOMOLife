import React from "react";
import PropTypes from "prop-types";

/**
 * Task search box with filter pills (Completed / Overdue).
 * Rendered only on the tasks tab.
 */
export default function SearchTasks({
  searchQuery = "",
  onSearchChange = () => {},
  filters = [],
  onToggleFilter = () => {},
  availableFilters = ["completed", "overdue"],
  placeholder = "Search tasks…",
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
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={placeholder}
          />
          {availableFilters && availableFilters.length > 0 && (
            <span
              className="material-icons filter-icon"
              aria-hidden="true"
              onClick={() => setFilterOpen((f) => !f)}
              data-testid="filter-button"
            >
              filter_list
            </span>
          )}

          {filterOpen && (
            <div className="filter-popup" data-testid="filter-popup">
              {availableFilters.map((type) => (
                <div
                  key={type}
                  className={`filter-pill ${type}`}
                  onClick={() => handleSelect(type)}
                >
                  {type === "completed"
                    ? "Completed"
                    : type === "overdue"
                    ? "Overdue"
                    : type === "starred"
                    ? "Starred"
                    : type === "upcoming"
                    ? "Upcoming"
                    : type}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {filters.length > 0 && (
        <div className="active-filters">
          {filters.map((f) => (
            <span key={f} className={`active-filter ${f}`}>
              {f === "completed"
                ? "Completed"
                : f === "overdue"
                ? "Overdue"
                : f === "starred"
                ? "Starred"
                : f === "upcoming"
                ? "Upcoming"
                : f}
              {" "}
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

SearchTasks.propTypes = {
  searchQuery: PropTypes.string,
  onSearchChange: PropTypes.func,
  filters: PropTypes.array,
  onToggleFilter: PropTypes.func,
  availableFilters: PropTypes.array,
  placeholder: PropTypes.string,
};
