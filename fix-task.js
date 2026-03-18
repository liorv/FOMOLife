const fs = require('fs');

let taskList = fs.readFileSync('packages/ui/src/TaskList/TaskList.tsx', 'utf8');
taskList = taskList.replace(
  /onTaskUpdate=\{onEditorUpdate\}/g,
  '{...(onEditorUpdate !== undefined && { onTaskUpdate: onEditorUpdate })}'
);
// Also it might have been duplicated if replaced badly
fs.writeFileSync('packages/ui/src/TaskList/TaskList.tsx', taskList);

let taskRow = fs.readFileSync('packages/ui/src/TaskList/TaskRow.tsx', 'utf8');
taskRow = taskRow.replace(
  /  onTaskUpdate\?: \(taskId: string, updates: Partial<ProjectTask>\) => void;\n  onTaskUpdate\?: \(taskId: string, updates: Partial<ProjectTask>\) => void;/g,
  '  onTaskUpdate?: (taskId: string, updates: Partial<ProjectTask>) => void;'
);
taskRow = taskRow.replace(
  /onDragEnd,\n\s*onTaskUpdate,\n\s*onTaskUpdate,/g,
  'onDragEnd,\n  onTaskUpdate,'
);

if (!taskRow.includes('onTaskUpdate')) {
    // it probably didn't get added to the props destructuring. Let's make sure it did.
}

let rowFuncArgsRegex = /export default function TaskRow\(\{\s*(.*?)\s*\}\: TaskRowProps\)/s;
taskRow = taskRow.replace(rowFuncArgsRegex, (match, args) => {
    if (!args.includes('onTaskUpdate')) {
        let newArgs = args.replace('onDragEnd,', 'onDragEnd,\n  onTaskUpdate,');
        return `export default function TaskRow({
${newArgs}
}: TaskRowProps)`;
    }
    return match;
});

fs.writeFileSync('packages/ui/src/TaskList/TaskRow.tsx', taskRow);

// Fix TaskModal duplicates
let taskModal = fs.readFileSync('packages/ui/src/TaskList/TaskModal.tsx', 'utf8');
taskModal = taskModal.replace(
  /const \[effort, setEffort\] = useState<number \| null \| undefined>\(task\.effort\);\s*const \[effort, setEffort\] = useState<number \| null \| undefined>\(task\.effort\);/g,
  'const [effort, setEffort] = useState<number | null | undefined>(task.effort);'
);
taskModal = taskModal.replace(
  /effort: task\.effort,\s*effort: task\.effort,/g,
  'effort: task.effort,'
);
taskModal = taskModal.replace(
  /effort: latest\.effort !== undefined \? latest\.effort : null,\s*effort: latest\.effort !== undefined \? latest\.effort : null,/g,
  'effort: latest.effort !== undefined ? latest.effort : null,'
);
taskModal = taskModal.replace(
  /effort: effort !== undefined \? effort : null,\s*effort: effort !== undefined \? effort : null,/g,
  'effort: effort !== undefined ? effort : null,'
);

fs.writeFileSync('packages/ui/src/TaskList/TaskModal.tsx', taskModal);

