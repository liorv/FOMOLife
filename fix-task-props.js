const fs = require('fs');
let taskFile = fs.readFileSync('packages/ui/src/TaskList/Task.tsx', 'utf8');

const taskFuncRegex = /export default function Task\(\{\s*(.*?)\s*\}\: TaskProps\)/s;
taskFile = taskFile.replace(taskFuncRegex, (match, args) => {
    if (!args.includes('onTaskUpdate')) {
        let newArgs = args.replace('onDragEnd,\n', 'onDragEnd,\n  onTaskUpdate,\n');
        return `export default function Task({
${newArgs}
}: TaskProps)`;
    }
    return match;
});

// Also make sure it's passed to TaskRow
taskFile = taskFile.replace(
  /newlyAddedTaskId=\{newlyAddedTaskId\}/,
  '{...(onTaskUpdate !== undefined && { onTaskUpdate })}\n          newlyAddedTaskId={newlyAddedTaskId}'
);
fs.writeFileSync('packages/ui/src/TaskList/Task.tsx', taskFile);
