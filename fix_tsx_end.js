const fs = require('fs');

let content = fs.readFileSync('components/projects/ProjectEditor.tsx', 'utf8');

// fix comment:
content = content.replace('{/* Project Header section */', '{/* Project Header section */}');

// add closing div right before the final </div> (which corresponds to <div className="project-editor">)
// The end of file looks like:
/*
      )}
    </div>
  );
}
*/
const match = /    <\/div>\s*\n\s*\);\s*\n\}/;
if (match.test(content)) {
  content = content.replace(match, '      </div>\n    </div>\n  );\n}');
} else {
  console.log("Could not find end tag match! Checking end of file:");
  console.log(content.slice(-100));
}

fs.writeFileSync('components/projects/ProjectEditor.tsx', content);
console.log('done tsx end');
