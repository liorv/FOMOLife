const fs = require('fs');
let taskFile = fs.readFileSync('packages/ui/src/TaskList/Task.tsx', 'utf8');

taskFile = taskFile.replace(
  /onDragEnd,\n  newlyAddedTaskId/g,
  'onDragEnd,\n  onTaskUpdate,\n  newlyAddedTaskId'
);
taskFile = taskFile.replace(
/\{\.\.\.\(onTaskUpdate !== undefined && \{ onTaskUpdate \}\)\}\n\s*\{\.\.\.\(onTaskUpdate !== undefined && \{ onTaskUpdate \}\)\}/g,
'{...(onTaskUpdate !== undefined && { onTaskUpdate })}'
);

fs.writeFileSync('packages/ui/src/TaskList/Task.tsx', taskFile);
