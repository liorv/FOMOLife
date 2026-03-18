const fs = require('fs');

let content = fs.readFileSync('packages/ui/src/ProjectTile.tsx', 'utf8');

const targetStr = `<div className={\`\${styles.progressPercent} progress-percent\`}>
                  {progress}%
                </div>`;
                
const replacement = `<div className={\`\${styles.progressPercent} progress-percent\`}>
                  {progress === 100 ? (
                    <span className="material-icons" style={{ fontSize: '32px' }}>check</span>
                  ) : (
                    <>{progress}%</>
                  )}
                </div>`;

if(content.includes('<div className={`${styles.progressPercent} progress-percent`}>\n                  {progress}%\n                </div>')) {
    content = content.replace('<div className={`${styles.progressPercent} progress-percent`}>\n                  {progress}%\n                </div>', replacement);
    fs.writeFileSync('packages/ui/src/ProjectTile.tsx', content);
    console.log("Patched ProjectTile.tsx");
} else {
    console.log("Could not find progress text");
}
