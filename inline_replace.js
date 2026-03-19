const fs = require('fs');
const file = 'components/projects/ProjectsDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\s*\{\/\* Sticky project header with inline-editable title \*\/\}.*?\{\/\* Project editor \(subprojects \+ tasks\) \*\/\}\s*<ProjectEditor/s;

const newStr = `
            {/* Project editor (subprojects + tasks) */}
            <ProjectEditor
              dashboardProjectHeaderTop={
                <>
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
                        onTitleChange?.(selectedProject.id, newText);
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
                </>
              }
              dashboardSummary={
                <div className="dashboard-summary">
                  <SummaryCard
                    icon="check_circle"
                    label="Completed"
                    value={completedTasks}
                    accent="success"
                    clickable
                    active={isFilterActive("completed")}
                    onClick={() => onToggleFilter?.("completed")}
                  />
                  <SummaryCard
                    icon="star"
                    label="Starred"
                    value={starredCount}
                    accent="star"
                    clickable
                    active={isFilterActive("starred")}
                    onClick={() => onToggleFilter?.("starred")}
                  />
                  <SummaryCard
                    icon="warning"
                    label="Overdue"
                    value={overdueCount}
                    accent="danger"
                    clickable
                    active={isFilterActive("overdue")}
                    onClick={() => onToggleFilter?.("overdue")}
                  />
                  <SummaryCard
                    icon="upcoming"
                    label="Upcoming"
                    value={upcomingCount}
                    accent="info"
                    clickable
                    active={isFilterActive("upcoming")}
                    onClick={() => onToggleFilter?.("upcoming")}
                  />
                </div>
              }`;

content = content.replace(regex, newStr);
fs.writeFileSync(file, content);
console.log('done');
