const fs = require('fs');

let css = fs.readFileSync('app/globals.css', 'utf-8');

// replace only padding-top to what it was: padding-top: var(--nav-height);
// wait we need padding-bottom! 
// let's do:
css = css.replace(/padding-top: var\(--nav-height\);.*/g, 'padding-top: var(--nav-height);\n  padding-bottom: calc(var(--nav-height) + 10px);');

// update host-pane
css = css.replace(/\.host-pane \{[\s\S]*?\}/, `.host-pane {
  min-width: 0;
  min-height: 0;
  background: transparent;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
}`);

// in main-layout, be sure it's box-sizing: border-box
// check if it has it
if (!css.includes('box-sizing: border-box;') || !css.match(/\.main-layout\s*\{[^}]*box-sizing\s*:([^}]+)\}/)) {
    css = css.replace(/\.main-layout \{/, '.main-layout {\n  box-sizing: border-box;');
}

fs.writeFileSync('app/globals.css', css);
