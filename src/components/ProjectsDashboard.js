import React, { useState, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import ProjectEditor from "./ProjectEditor";
import ProjectTile from "./ProjectTile";

// ─── Summary metric card ─────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, accent, onClick, active, clickable }) {
  return (
    <div
      className={[
        "dashboard-card",
        accent ? `dashboard-card--${accent}` : "",
        clickable ? "dashboard-card--clickable" : "",
        active ? "dashboard-card--active" : "",
      ].filter(Boolean).join(" ")}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable && onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <span className="material-icons dashboard-card__icon">{icon}</span>
      <div className="dashboard-card__body">
        <span className="dashboard-card__value">{value}</span>
        <span className="dashboard-card__label">{label}</span>
      </div>
      {active && <span className="dashboard-card__active-dot" />}
    </div>
  );
}

SummaryCard.propTypes = {
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  accent: PropTypes.string,
  onClick: PropTypes.func,
  active: PropTypes.bool,
  clickable: PropTypes.bool,
};

// ─── Main dashboard component ─────────────────────────────────────────────────

export default function ProjectsDashboard({
  projects = [],
  people = [],
  selectedProjectId,
  onSelectProject,
  onApplyChange,
  onAddSubproject,
  newlyAddedSubprojectId,
  onClearNewSubproject,
  onSubprojectDeleted,
  onColorChange,
  onReorder,
  onDeleteProject,
  onAddProject,
  onOpenPeople,
  onCreatePerson,
  onTitleChange,
  projectSearch = "",
}) {
  const [activeFilter, setActiveFilter] = useState(null); // null | 'starred' | 'overdue' | 'upcoming'
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const addingRef = useRef(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Filter sidebar by search query
  const visibleProjects = useMemo(
    () =>
      !projectSearch.trim()
        ? projects
        : projects.filter((p) =>
            (p.text || "").toLowerCase().includes(projectSearch.toLowerCase()),
          ),
    [projects, projectSearch],
  );

  // ── Metrics: scoped to selected project when one is selected ──────────────

  const scopedTasks = useMemo(() => {
    const source = selectedProject
      ? [selectedProject]
      : projects;
    return source.flatMap((p) => (p.subprojects || []).flatMap((s) => s.tasks || []));
  }, [projects, selectedProject]);

  const scopedSubprojects = useMemo(() => {
    const source = selectedProject ? [selectedProject] : projects;
    return source.flatMap((p) =>
      (p.subprojects || []).filter((s) => !s.isProjectLevel),
    );
  }, [projects, selectedProject]);

  const completedTasks = useMemo(() => scopedTasks.filter((t) => t.done).length, [scopedTasks]);
  const completedSubprojects = useMemo(
    () => scopedSubprojects.filter((s) => (s.tasks || []).length > 0 && (s.tasks || []).every((t) => t.done)).length,
    [scopedSubprojects],
  );

  const starredCount = useMemo(
    () => scopedTasks.filter((t) => (t.starred || t.favorite) && !t.done).length,
    [scopedTasks],
  );

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return scopedTasks.filter((t) => !t.done && t.dueDate && new Date(t.dueDate) < today).length;
  }, [scopedTasks]);

  const upcomingCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inSeven = new Date(today);
    inSeven.setDate(today.getDate() + 7);
    return scopedTasks.filter((t) => {
      if (t.done || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= today && d <= inSeven;
    }).length;
  }, [scopedTasks]);

  // Toggle a filter — clicking the active filter clears it
  const toggleFilter = (f) => setActiveFilter((prev) => (prev === f ? null : f));

  // Clear filter when switching projects
  const handleSelectProject = (id) => {
    setActiveFilter(null);
    onSelectProject(id);
  };

  // Navigate back (deselect project — useful on mobile)
  const handleBack = () => {
    setActiveFilter(null);
    setFabMenuOpen(false);
    onSelectProject(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`projects-dashboard${selectedProject ? " dashboard--has-project" : ""}`}>
      {selectedProject ? (
        /* ── Main body: full-width content for selected project ── */
        <div className="dashboard-body">
          <div className="dashboard-content">
            {/* Sticky project header with inline-editable title */}
            <div className="dashboard-project-header">
              <button
                className="dashboard-back-btn"
                onClick={handleBack}
                title="Back to projects"
                aria-label="Back to projects"
              >
                <span className="material-icons">arrow_back_ios</span>
              </button>
              <span
                className="dashboard-project-dot-lg"
                style={{ background: selectedProject.color || "#1a73e8" }}
              />
              <h2
                className="dashboard-project-title"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newText = e.currentTarget.textContent.trim();
                  if (newText && newText !== selectedProject.text) {
                    onTitleChange(selectedProject.id, newText);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
              >
                {selectedProject.text}
              </h2>
              <div className="dashboard-project-actions">
                <button
                  title="Delete project"
                  className="dashboard-project-delete"
                  onClick={() => onDeleteProject(selectedProject.id)}
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>
            </div>

            {/* Summary chips — contextual to selected project */}
            <div className="dashboard-summary">
              <SummaryCard
                icon="folder_copy"
                label="Sub-Projects"
                value={`${completedSubprojects} / ${scopedSubprojects.length}`}
                />
                <SummaryCard
                  icon="task_alt"
                  label="Tasks"
                  value={`${completedTasks} / ${scopedTasks.length}`}
                />
                <SummaryCard
                  icon="star"
                  label="Starred"
                  value={starredCount}
                  accent="star"
                  clickable
                  active={activeFilter === "starred"}
                  onClick={() => toggleFilter("starred")}
                />
                <SummaryCard
                  icon="event_busy"
                  label="Overdue"
                  value={overdueCount}
                  accent={overdueCount > 0 ? "danger" : undefined}
                  clickable
                  active={activeFilter === "overdue"}
                  onClick={() => toggleFilter("overdue")}
                />
                <SummaryCard
                  icon="upcoming"
                  label="Upcoming"
                  value={upcomingCount}
                  accent="info"
                  clickable
                  active={activeFilter === "upcoming"}
                  onClick={() => toggleFilter("upcoming")}
                />
              </div>

              {/* Project editor (subprojects + tasks) */}
              <ProjectEditor
                key={selectedProject.id}
                project={selectedProject}
                onApplyChange={(updated) => onApplyChange(selectedProject.id, updated)}
                onAddSubproject={onAddSubproject}
                newlyAddedSubprojectId={newlyAddedSubprojectId}
                onClearNewSubproject={onClearNewSubproject}
                allPeople={people}
                onOpenPeople={onOpenPeople}
                onCreatePerson={onCreatePerson}
                onSubprojectDeleted={onSubprojectDeleted}
                taskFilter={activeFilter}
              />
            </div>
          </div>
          ) : (
            /* ── Home: watermark + direct grid ── */
            <>
              {/* Subtle background watermark */}
              <div className="dashboard-home-bg">
                <span className="material-icons dashboard-home-bg__icon">folder_open</span>
                <p className="dashboard-home-bg__text">
                  {projects.length === 0
                    ? <>No projects yet. Tap <strong>+</strong> to create one.</>
                    : <>Tap a project to open it, or press <strong>+</strong> to create one.</>}
                </p>
                <div className="dashboard-global-stats">
                  <span className="dashboard-stat-chip">
                    <span className="material-icons">folder</span>
                    {projects.length} project{projects.length !== 1 ? "s" : ""}
                  </span>
                  <span className="dashboard-stat-chip">
                    <span className="material-icons">group</span>
                    {people.length} contact{people.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Project tiles grid */}
              {visibleProjects.length === 0 && projectSearch ? (
                <p className="sidebar-no-results">No matches for &ldquo;{projectSearch}&rdquo;</p>
              ) : (
                <div className="dashboard-tiles-grid" style={{ justifyContent: 'center', margin: '10px auto 0 auto' }}>
                  {visibleProjects.map((p) => (
                    <div
                      key={p.id}
                      className="dashboard-tile-wrapper"
                      onClick={() => handleSelectProject(p.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleSelectProject(p.id)}
                    >
                      <ProjectTile
                        project={p}
                        onEdit={handleSelectProject}
                        onDelete={onDeleteProject}
                        onChangeColor={onColorChange}
                        onReorder={onReorder}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

      {/* ── FAB — New Project or Add Sub-project ── */}
      {!selectedProject ? (
        <button className="fab" onClick={() => onAddProject()} title="New project" aria-label="New project">
          <span className="material-icons">add</span>
        </button>
      ) : (
        <>
          <button
            className="fab"
            onClick={() => setFabMenuOpen(!fabMenuOpen)}
            title={fabMenuOpen ? "Close" : "Add sub-project"}
          >
            <span className="material-icons">{fabMenuOpen ? "close" : "add"}</span>
          </button>
          {fabMenuOpen && (
            <div className="fab-menu" role="menu">
              <button
                className="fab-small"
                onClick={() => {
                  if (!addingRef.current) {
                    addingRef.current = true;
                    onAddSubproject("");
                    setFabMenuOpen(false);
                    setTimeout(() => { addingRef.current = false; }, 500);
                  }
                }}
                title="Add sub-project"
              >
                <span className="material-icons">edit</span>
                <span className="fab-label">Add sub-project</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

ProjectsDashboard.propTypes = {
  projects: PropTypes.array,
  people: PropTypes.array,
  selectedProjectId: PropTypes.string,
  onSelectProject: PropTypes.func.isRequired,
  onApplyChange: PropTypes.func.isRequired,
  onAddSubproject: PropTypes.func.isRequired,
  newlyAddedSubprojectId: PropTypes.string,
  onClearNewSubproject: PropTypes.func,
  onSubprojectDeleted: PropTypes.func,
  onColorChange: PropTypes.func,
  onReorder: PropTypes.func.isRequired,
  onDeleteProject: PropTypes.func.isRequired,
  onAddProject: PropTypes.func.isRequired,
  onOpenPeople: PropTypes.func,
  onCreatePerson: PropTypes.func,
  onTitleChange: PropTypes.func.isRequired,
  projectSearch: PropTypes.string,
};
