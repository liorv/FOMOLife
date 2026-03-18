const log = require('./trace.json');
const filtered = log.logs.filter(l => 
  l.action === 'loadSystemData_start' || 
  l.action.startsWith('saveSystem') || 
  l.action.startsWith('deleteContact') || 
  l.action.startsWith('requestLinkage')
).map(l => ({
  action: l.action, 
  info: l.meta, 
  time: l.t
}));
console.log(JSON.stringify(filtered, null, 2));
