const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'app/globals.css');
let content = fs.readFileSync(file, 'utf8');

// The internal style maps in renderComponent are blocking scroll
// They output style={{ height: '100%', overflow: 'hidden' }}
// The react file is components/FrameworkHost.tsx, let's fix that.
