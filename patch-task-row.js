const fs = require('fs');

let taskList = fs.readFileSync('packages/ui/src/TaskList/TaskList.tsx', 'utf8');
taskList = taskList.replace(
  /onClearNewTask=\{onClearNewTask\}\s*\/>/g,
  'onClearNewTask={onClearNewTask}\n            onTaskUpdate={onEditorUpdate}\n          />'
);
taskList = taskList.replace(
  /onDragEnd\}\)}\s*>/g,
  'onDragEnd} )}\n              onTaskUpdate={onEditorUpdate}\n            >'
);
fs.writeFileSync('packages/ui/src/TaskList/TaskList.tsx', taskList);

let taskFile = fs.readFileSync('packages/ui/src/TaskList/Task.tsx', 'utf8');
taskFile = taskFile.replace(
  /onDragEnd\?: \(taskId: string, e: React\.DragEvent\) => void;/g,
  '$&\n  onTaskUpdate?: (taskId: string, updates: Partial<ProjectTask>) => void;'
);
taskFile = taskFile.replace(
  /onDragEnd,\n\s*newlyAddedTaskId/g,
  'onDragEnd,\n  onTaskUpdate,\n  newlyAddedTaskId'
);
taskFile = taskFile.replace(
  /onDragEnd\}\)}\s*newlyAddedTaskId/g,
  'onDragEnd} )}\n          {...(onTaskUpdate !== undefined && { onTaskUpdate })}\n          newlyAddedTaskId'
);
fs.writeFileSync('packages/ui/src/TaskList/Task.tsx', taskFile);

// For TaskRow.tsx, let's read it first to verify exact matches.
