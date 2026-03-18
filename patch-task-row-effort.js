const fs = require('fs');

let rowFile = fs.readFileSync('packages/ui/src/TaskList/TaskRow.tsx', 'utf8');

const effortHtml = `
        {item.effort != null && (
          <div className="effort-container" title={\`Effort: \${item.effort} days\`}>
            <span
              className="task-effort"
              style={{
                fontSize: "0.85em",
                color: "#666",
                background: "#f0f0f0",
                padding: "2px 6px",
                borderRadius: "4px",
                whiteSpace: "nowrap"
              }}
            >
              {item.effort}d
            </span>
          </div>
        )}
`;

rowFile = rowFile.replace(
  /\{\/\* Right group: date, avatars, star, delete \*\/}\n\s*<div className="right-group">/,
  `{/* Right group: date, avatars, star, delete */}\n      <div className="right-group">\n${effortHtml}`
);

fs.writeFileSync('packages/ui/src/TaskList/TaskRow.tsx', rowFile);
