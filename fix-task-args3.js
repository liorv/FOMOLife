const fs = require('fs');
let taskFile = fs.readFileSync('packages/ui/src/TaskList/Task.tsx', 'utf8');

taskFile = taskFile.replace(
  /onDragEnd,\n\s*newlyAddedTaskId = null,/g,
  'onDragEnd,\n  onTaskUpdate,\n  newlyAddedTaskId = null,'
);

fs.writeFileSync('packages/ui/src/TaskList/Task.tsx', taskFile);
