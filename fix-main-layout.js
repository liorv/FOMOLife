const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf-8');

// Replace .main-layout entirely
const newMainLayout = `.main-layout {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background:
    linear-gradient(rgba(241, 243, 244, 0.92), rgba(241, 243, 244, 0.92)),
    url('/assets/circuit-bg.png') center top / cover no-repeat;
  padding-top: var(--nav-height);
  padding-bottom: calc(var(--nav-height) + 10px);
}`;

css = css.replace(/\.main-layout \{[\s\S]*?\}/, newMainLayout);
fs.writeFileSync('app/globals.css', css);
console.log('Fixed main-layout in globals.css');
