const trace = require('./trace3.json');
trace.logs.filter(t => t.t >= '2026-03-18T05:08:48.000Z' && t.t <= '2026-03-18T05:08:56.000Z' && t.action.indexOf('getOrInit') === -1).forEach(t => console.log(new Date(t.t).toISOString(), t.action, JSON.stringify(t.meta).substring(0, 150)));
