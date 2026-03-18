const fs = require('fs');

let route = fs.readFileSync('app/api/tasks/route.ts', 'utf8');
route = route.replace(
  /'text' \| 'done' \| 'dueDate' \| 'favorite' \| 'description' \| 'people' \| 'priority'/g,
  "'text' | 'done' | 'dueDate' | 'favorite' | 'description' | 'people' | 'priority' | 'effort'"
);
route = route.replace(
  /priority\?: "low" \| "medium" \| "high" \| null;/g,
  '$&\n    effort?: number | null;'
);
route = route.replace(
  /\.\.\.\(body\.priority !== undefined \? \{ priority: body\.priority \} : \{\}\),/,
  '$&\n    ...(body.effort !== undefined ? { effort: body.effort } : {}),'
);
fs.writeFileSync('app/api/tasks/route.ts', route);

let store = fs.readFileSync('lib/tasks/server/tasksStore.ts', 'utf8');
store = store.replace(
  /'text' \| 'done' \| 'dueDate' \| 'favorite' \| 'description' \| 'people' \| 'priority'/g,
  "'text' | 'done' | 'dueDate' | 'favorite' | 'description' | 'people' | 'priority' | 'effort'"
);
store = store.replace(
  /'dueDate' \| 'favorite' \| 'description' \| 'people' \| 'priority'/g,
  "'dueDate' | 'favorite' | 'description' | 'people' | 'priority' | 'effort'"
);
store = store.replace(
  /priority\?: "low" \| "medium" \| "high" \| null;/g,
  '$&\n  effort?: number | null;'
);
store = store.replace(
  /\.\.\.\(input\.priority !== undefined \? \{ priority: input\.priority \} : \{\}\),/,
  '$&\n    ...(input.effort !== undefined ? { effort: input.effort } : {}),'
);
fs.writeFileSync('lib/tasks/server/tasksStore.ts', store);
