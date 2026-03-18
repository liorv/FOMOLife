const fs = require('fs');
let code = fs.readFileSync('components/projects/ProjectsDashboard.tsx', 'utf8');

const targetStr = '<button\n                style={{\n                  background: \'#fff\',\n                  border: \'1px solid #e0e0e0\',\n                  padding: \'10px 16px\',\n                  borderRadius: \'20px\',\n                  cursor: \'pointer\',\n                  boxShadow: \'0 4px 12px rgba(0,0,0,0.15)\',\n                  display: \'flex\',\n                  alignItems: \'center\',\n                  gap: \'8px\',\n                  fontSize: \'14px\',\n                  fontWeight: 500,\n                  color: \'#333\',\n                  fontFamily: \'inherit\',\n                }}\n                onClick={() => {\n                  setIsFabMenuOpen(false);\n                  setShowAiModal(true);\n                }}\n              >\n                <span className="material-icons" style={{ fontSize: \'18px\', color: \'#666\' }}>\n                  psychology\n                </span>\n                Create with AI\n              </button>';

if (code.includes('Create with AI')) {
   code = code.replace(/<button[^>]*?Create with AI[\s\S]*?<\/button>/, (match) => {
       return `{!selectedProject && (\n              ${match}\n            )}`;
   });
}

fs.writeFileSync('components/projects/ProjectsDashboard.tsx', code);
