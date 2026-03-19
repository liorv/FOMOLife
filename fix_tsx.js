const fs = require('fs');

let content = fs.readFileSync('components/projects/ProjectEditor.tsx', 'utf8');

// Find the header div and the content div and wrap them
const regexToReplace = /(\{!\s*showFlatFilterView.*?className="project-editor-header">.*?)(<\/div>\s*\)\s*\}$)/s;

// Wait, doing this via string exact matches:
const originalStr = `      {/* Project Header section */}
      {!showFlatFilterView && (!searchQuery || searchQuery.trim() === "") && (
        <div className="project-editor-header">
          <input
            value={local.goal || ''}
            onChange={(e) => updateProjectField('goal', e.target.value)}
            placeholder="Project Goal..."
            disabled={!canManage}
            className="project-editor-goal-input"
          />
          <textarea
            value={local.description || ''}
            onChange={(e) => updateProjectField('description', e.target.value)}
            placeholder="Project Description... what exactly are you trying to accomplish here?"
            disabled={!canManage}
            className="project-editor-description-input"
          />
          <div className="project-editor-date-container">
            <span className="material-icons">event</span>
            <input
              type="date"
              value={local.dueDate || ''}
              onChange={(e) => updateProjectField('dueDate', e.target.value)}
              disabled={!canManage}
            />
          </div>
        </div>
      )}

      {/* Conditionally render content */}
      {(showFlatFilterView || (searchQuery && searchQuery.trim() !== "") || activeTab === 'tasks') && (
        <div className="project-editor-content">`;

const replaceStr = `      <div className="project-editor-scroll-area">
        {/* Project Header section */}
        {!showFlatFilterView && (!searchQuery || searchQuery.trim() === "") && (
          <div className="project-editor-header">
            <input
              value={local.goal || ''}
              onChange={(e) => updateProjectField('goal', e.target.value)}
              placeholder="Project Goal..."
              disabled={!canManage}
              className="project-editor-goal-input"
            />
            <textarea
              value={local.description || ''}
              onChange={(e) => updateProjectField('description', e.target.value)}
              placeholder="Project Description... what exactly are you trying to accomplish here?"
              disabled={!canManage}
              className="project-editor-description-input"
            />
            <div className="project-editor-date-container">
              <span className="material-icons">event</span>
              <input
                type="date"
                value={local.dueDate || ''}
                onChange={(e) => updateProjectField('dueDate', e.target.value)}
                disabled={!canManage}
              />
            </div>
          </div>
        )}

        {/* Conditionally render content */}
        {(showFlatFilterView || (searchQuery && searchQuery.trim() !== "") || activeTab === 'tasks') && (
          <div className="project-editor-content">`;

content = content.replace(originalStr, replaceStr);

// We need to add closing div for scroll area
const originalEnd = `      {activeTab === 'risk' && (
        <div>Render Risk Table Extracted Component</div>
      )}
    </div>
  );
}`;
const replaceEnd = `      {activeTab === 'risk' && (
        <div>Render Risk Table Extracted Component</div>
      )}
      </div>
    </div>
  );
}`;
content = content.replace(originalEnd, replaceEnd);

fs.writeFileSync('components/projects/ProjectEditor.tsx', content);
console.log('done tsx');
