const fs = require('fs');
const file = 'components/projects/ProjectsDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

const functionBody = `function handleAssistantPatch(patch: any, selectedProject: ProjectItem, onApplyChange: any) {
  try {
    if (patch && typeof patch === 'object') {
      // Normalize action name (support both \\\`action\\\` and \\\`type\\\` from assistant)
      const actionName = String(patch.action || patch.type || '').toLowerCase();
      // Support generic assistant actions
      if ((actionName === 'add_task' || actionName === 'add-task' || actionName === 'addtask') && patch.payload) {
        const title = patch.payload.title || patch.payload.text || patch.payload.description || 'New Item';
        const targetNameOrId = patch.payload.subprojectId || patch.payload.subproject || patch.payload.listName || null;
        const existingSubs = [...(selectedProject.subprojects || [])];
        let targetSub = null;
        if (targetNameOrId) {
          const tn = String(targetNameOrId).toLowerCase();
          targetSub = existingSubs.find((s: any) => String(s.id) === tn || (s.title || s.text || '').toLowerCase().includes(tn));
        } else {
          targetSub = existingSubs.find((s: any) => {
            const t = (s.title || s.text || '').toLowerCase();
            return t.includes('list') || t.includes('tv') || t.includes('inbox') || t.includes('todo') || t.includes('tasks');
          });
        }
        
        const newTask = { id: \\\`ai-\\\${Date.now()}-\\\${Math.random().toString(36).slice(2,8)}\\\`, text: title, description: title, people: [], done: false, favorite: false, dueDate: null };
        let updatedSubprojects = existingSubs;
        if (targetSub) {
          updatedSubprojects = updatedSubprojects.map((s: any) => s.id === targetSub?.id ? { ...s, tasks: [...(s.tasks || []), newTask] } : s);
        } else {
          const newSubName = targetNameOrId || 'General List';
          const newSub = { id: \\\`ai-sub-\\\${Date.now()}-\\\${Math.random().toString(36).slice(2,8)}\\\`, text: newSubName, title: newSubName, tasks: [newTask] };
          updatedSubprojects = [...existingSubs, newSub];
        }
        onApplyChange?.(selectedProject.id, { subprojects: updatedSubprojects });
      } else if ((actionName === 'batch_actions' || actionName === 'batch_update' || actionName === 'batchupdate') && Array.isArray(patch.payload?.actions)) {
        let updatedSubprojects = [...(selectedProject.subprojects || [])];
        
        // Helper to incrementally apply known operations to the local state reference before final save
        const processAction = (subActionName: string, subPayload: any) => {
           if ((subActionName === 'remove-task' || subActionName === 'remove_task' || subActionName === 'removetask') && subPayload) {
              const taskId = subPayload.taskId || subPayload.id || subPayload.taskID;
              if (taskId) {
                updatedSubprojects = updatedSubprojects.map((s: any) => ({
                  ...s,
                  tasks: (s.tasks || []).filter((t: any) => String(t.id) !== String(taskId))
                }));
              }
           } else if ((subActionName === 'add_task' || subActionName === 'add-task' || subActionName === 'addtask') && subPayload) {
              const title = subPayload.title || subPayload.text || subPayload.description || 'New Item';
              const targetNameOrId = subPayload.subprojectId || subPayload.subproject || subPayload.listName || null;
              let targetSub = null;
              if (targetNameOrId) {
                const tn = String(targetNameOrId).toLowerCase();
                targetSub = updatedSubprojects.find((s: any) => String(s.id) === tn || (s.title || s.text || '').toLowerCase().includes(tn));
              } else {
                targetSub = updatedSubprojects.find((s: any) => {
                  const t = (s.title || s.text || '').toLowerCase();
                  return t.includes('list') || t.includes('tv') || t.includes('inbox') || t.includes('todo') || t.includes('tasks');
                });
              }
              const newTask = { id: \\\`ai-\\\${Date.now()}-\\\${Math.random().toString(36).slice(2,8)}\\\`, text: title, description: title, people: [], done: false, favorite: false, dueDate: null };
              if (targetSub) {
                updatedSubprojects = updatedSubprojects.map((s: any) => s.id === targetSub?.id ? { ...s, tasks: [...(s.tasks || []), newTask] } : s);
              } else {
                const newSubName = targetNameOrId || 'General List';
                const newSub = { id: \\\`ai-sub-\\\${Date.now()}-\\\${Math.random().toString(36).slice(2,8)}\\\`, text: newSubName, title: newSubName, tasks: [newTask] };
                updatedSubprojects = [...updatedSubprojects, newSub];
              }
           } else if ((subActionName === 'add_subproject' || subActionName === 'add-subproject' || subActionName === 'addsubproject') && subPayload) {
              const title = subPayload.title || subPayload.text || subPayload.description || 'New List';
              const newSub = { id: \\\`ai-sub-\\\${Date.now()}-\\\${Math.random().toString(36).slice(2,8)}\\\`, text: title, title: title, tasks: [] };
              updatedSubprojects = [...updatedSubprojects, newSub];
           } else if ((subActionName === 'edit-task' || subActionName === 'edit_task' || subActionName === 'edittask') && subPayload) {
             const taskId = subPayload.taskId || subPayload.id || subPayload.taskID;
             if (taskId) {
               updatedSubprojects = updatedSubprojects.map((s: any) => ({
                  ...s,
                  tasks: (s.tasks || []).map((t: any) => {
                    if (String(t.id) !== String(taskId)) return t;
                    const updatedTask = { ...t };
                    const newTitle = subPayload.text || subPayload.title || subPayload.description;
                    if (newTitle) {
                      updatedTask.text = newTitle;
                      updatedTask.description = newTitle;
                    } else if (subPayload.description) {
                      updatedTask.description = subPayload.description;
                    }
                    if (subPayload.done !== undefined) updatedTask.done = !!subPayload.done;
                    if (subPayload.priority !== undefined) updatedTask.priority = subPayload.priority;
                    if (subPayload.effort !== undefined) updatedTask.effort = subPayload.effort;
                    if (subPayload.dueDate !== undefined) updatedTask.dueDate = subPayload.dueDate;
                    if (subPayload.assignee !== undefined) updatedTask.assignee = subPayload.assignee;
                    return updatedTask;
                  })
               }));
             }
           }
        };

        patch.payload.actions.forEach((a: any) => {
          if (a && typeof a === 'object') {
             processAction(String(a.action || a.type || '').toLowerCase(), a.payload);
          }
        });
        onApplyChange?.(selectedProject.id, { subprojects: updatedSubprojects });
      } else if ((actionName === 'remove-task' || actionName === 'remove_task' || actionName === 'removetask') && patch.payload) {
        const taskId = patch.payload.taskId || patch.payload.id || patch.payload.taskID;
        if (taskId) {
          const updatedSubprojects = (selectedProject.subprojects || []).map((s: any) => ({
            ...s,
            tasks: (s.tasks || []).filter((t: any) => String(t.id) !== String(taskId))
          }));
          onApplyChange?.(selectedProject.id, { subprojects: updatedSubprojects });
        }
      } else if ((actionName === 'remove_subproject' || actionName === 'remove-subproject') && patch.payload) {
        const subId = patch.payload.subprojectId || patch.payload.id;
        if (subId) {
          const updatedSubprojects = (selectedProject.subprojects || []).filter((s: any) => String(s.id) !== String(subId));
          onApplyChange?.(selectedProject.id, { subprojects: updatedSubprojects });
        }
      } else if ((actionName === 'edit-task' || actionName === 'edit_task' || actionName === 'edittask') && patch.payload) {
        const taskId = patch.payload.taskId || patch.payload.id || patch.payload.taskID;
        if (taskId) {
          const updatedSubprojects = (selectedProject.subprojects || []).map((s: any) => ({
            ...s,
            tasks: (s.tasks || []).map((t: any) => {
              if (String(t.id) !== String(taskId)) return t;
              // merge editable fields from payload
              const updated = { ...t };
              const newTitle = patch.payload.text || patch.payload.title || patch.payload.description;
              if (newTitle) {
                updated.text = newTitle;
                updated.description = newTitle;
              } else if (patch.payload.description) {
                updated.description = patch.payload.description;
              }
              if (patch.payload.done !== undefined) updated.done = !!patch.payload.done;
              if (patch.payload.priority !== undefined) updated.priority = patch.payload.priority;
              if (patch.payload.effort !== undefined) updated.effort = patch.payload.effort;
              if (patch.payload.dueDate !== undefined) updated.dueDate = patch.payload.dueDate;
              if (patch.payload.assignee !== undefined) updated.assignee = patch.payload.assignee;
              return updated;
            })
          }));
          onApplyChange?.(selectedProject.id, { subprojects: updatedSubprojects });
        }
      } else {
        // default: treat as a patch object and apply directly
        onApplyChange?.(selectedProject.id, patch);
      }
    }
  } catch (err) {
    console.error("Error applying patch from assistant", err);
  }
}
`;

const startIndex = code.indexOf('          onApplyBlueprint={(patch: any) => {');
const endIndex = code.indexOf('          }}', startIndex) + 12;

if (startIndex === -1 || endIndex < 12) {
  console.log("Could not find the function bounds");
  process.exit(1);
}

const newBody = `          onApplyBlueprint={(patch: any) => handleAssistantPatch(patch, selectedProject, onApplyChange)}
`;

code = code.substring(0, startIndex) + newBody + code.substring(endIndex);

code += "\\n\\n" + functionBody + "\\n";

fs.writeFileSync(file, code);
console.log("Success");
