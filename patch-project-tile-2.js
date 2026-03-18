const fs = require('fs');

let content = fs.readFileSync('packages/ui/src/ProjectTile.tsx', 'utf8');

const targetStr = `<div className={\`\${styles.progressSection} project-progress-section\`}>
          <div
            className={\`\${styles.progressVisualization} progress-visualization\`}
          >
            <div className={\`\${styles.progressCircle} progress-circle\`}>
              <svg
                className={\`\${styles.progressSvg} progress-svg\`}
                viewBox="0 0 120 120"
              >
                <circle
                  className={\`\${styles.progressBg} progress-bg\`}
                  cx="60"
                  cy="60"
                  r="50"
                  strokeWidth="8"
                />
                <circle
                  className={\`\${styles.progressFill} progress-fill\`}
                  cx="60"
                  cy="60"
                  r="50"
                  strokeWidth="8"
                  strokeDasharray={\`\${2 * Math.PI * 50}\`}
                  strokeDashoffset={\`\${2 * Math.PI * 50 * (1 - progress / 100)}\`}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className={\`\${styles.progressText} progress-text\`}>
                <div className={\`\${styles.progressPercent} progress-percent\`}>
                  {progress === 100 ? <span className="material-icons" style={{ fontSize: "32px" }}>check_circle</span> : \`\${progress}%\`}
                </div>
                {/* label removed per design; remaining CSS kept for potential future use */}
              </div>
            </div>
          </div>
        </div>`;

const replacementStr = `<div className={\`\${styles.progressSection} project-progress-section\`}>
          <div
            className={\`\${styles.progressVisualization} progress-visualization\`}
          >
            {progress === 100 ? (
              <span className="material-icons" style={{ fontSize: '100px', color: color || '#2196f3' }}>
                check_circle
              </span>
            ) : (
              <div className={\`\${styles.progressCircle} progress-circle\`}>
                <svg
                  className={\`\${styles.progressSvg} progress-svg\`}
                  viewBox="0 0 120 120"
                >
                  <circle
                    className={\`\${styles.progressBg} progress-bg\`}
                    cx="60"
                    cy="60"
                    r="50"
                    strokeWidth="8"
                  />
                  <circle
                    className={\`\${styles.progressFill} progress-fill\`}
                    cx="60"
                    cy="60"
                    r="50"
                    strokeWidth="8"
                    strokeDasharray={\`\${2 * Math.PI * 50}\`}
                    strokeDashoffset={\`\${2 * Math.PI * 50 * (1 - progress / 100)}\`}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className={\`\${styles.progressText} progress-text\`}>
                  <div className={\`\${styles.progressPercent} progress-percent\`}>
                    {\`\${progress}%\`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>`;

if(content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync('packages/ui/src/ProjectTile.tsx', content);
    console.log("Patched ProjectTile.tsx");
} else {
    console.log("Could not find progress text");
}
