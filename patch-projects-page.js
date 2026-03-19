const fs = require('fs');
let code = fs.readFileSync('components/projects/ProjectsPage.tsx', 'utf8');

// Add handleReprioritize logic before handleAddSubproject (or somewhere else convenient)
const reprioritizeLogic = `
  const handleReprioritize = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.subprojects) return;

    // We want to sort all open tasks by priority across all subprojects, 
    // but the task ordering is often per subproject. Wait, if we just modify the dueDates, we can iterate over them.
    // The requirement says: "re-order task dates based on priority". 
    // Meaning assign sequential due dates based on priority.

    // 1. Gather all tasks
    type TaskLookup = { subIndex: number, taskIndex: number, task: any };
    let openTasks: TaskLookup[] = [];
    project.subprojects.forEach((sub, sIdx) => {
      if (sub.tasks) {
        sub.tasks.forEach((t, tIdx) => {
          if (!t.completed) {
            openTasks.push({ subIndex: sIdx, taskIndex: tIdx, task: t });
          }
        });
      }
    });

    // 2. Sort by priority (high > medium > low > null)
    const prioWeight = { high: 3, medium: 2, low: 1 };
    openTasks.sort((a, b) => {
      const aWeight = (a.task.priority && prioWeight[a.task.priority]) || 0;
      const bWeight = (b.task.priority && prioWeight[b.task.priority]) || 0;
      return bWeight - aWeight; // Descending
    });

    // 3. Assign dueDates sequentially
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const newSubprojects = JSON.parse(JSON.stringify(project.subprojects));

    openTasks.forEach(({ subIndex, taskIndex, task }) => {
      // Assign the current date as dueDate
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      
      newSubprojects[subIndex].tasks[taskIndex].dueDate = \`\${year}-\${month}-\${day}\`;
      
      const effortDays = typeof task.effort === 'number' ? task.effort : 1;
      const daysToAdd = Math.max(1, Math.ceil(effortDays)); // at least 1 day
      currentDate.setDate(currentDate.getDate() + daysToAdd);
    });

    handleProjectApplyChange(projectId, { subprojects: newSubprojects });
  };
`;

if (!code.includes('handleReprioritize')) {
  // insert it before handleAddSubproject
  code = code.replace(/const handleAddSubproject =/g, reprioritizeLogic + '\n  const handleAddSubproject =');
  
  // also inject it into the JSX Props for ProjectsDashboard
  // <ProjectsDashboard
  code = code.replace(/(<ProjectsDashboard[\s\S]*?)(onApplyChange=\{handleProjectApplyChange\})/g, '$1onReprioritize={handleReprioritize}\n              $2');
  
  fs.writeFileSync('components/projects/ProjectsPage.tsx', code);
  console.log('Patched ProjectsPage.tsx');
}
