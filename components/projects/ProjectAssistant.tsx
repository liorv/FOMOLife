"use client";
import React, { useState, useRef, useEffect } from "react";
import type { ProjectTask } from "@myorg/types";

// Visual preview component using actual UI components
const ChangePreview = ({ modified, original }: { modified: any, original: any }) => {
  const changes: JSX.Element[] = [];
  const origSubs = original.sub_projects || [];
  const modSubs = modified.sub_projects || [];

  // New subprojects - show simplified static version
  const newSubs = modSubs.filter((ms: any) => !origSubs.find((os: any) => os.id === ms.id));
  newSubs.forEach((s: any) => {
    changes.push(
      <div key={`new-sub-${s.id}`} style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: '0.85em',
          color: '#666',
          marginBottom: '4px',
          fontWeight: '500'
        }}>
          📋 New list: "{s.title}" ({s.tasks?.length || 0} tasks)
        </div>
        <div style={{
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          padding: '8px',
          backgroundColor: '#fafafa',
          marginBottom: '8px'
        }}>
          {/* Simplified subproject header without interactive elements */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 0'
          }}>
            <span className="material-icons" style={{ fontSize: '18px', color: '#666' }}>
              folder
            </span>
            <span style={{
              fontWeight: '500',
              color: '#333',
              flex: 1
            }}>
              {s.title || "Untitled"}
            </span>
            <span style={{
              fontSize: '0.8em',
              color: '#666',
              backgroundColor: '#e0e0e0',
              padding: '2px 6px',
              borderRadius: '10px'
            }}>
              {s.tasks?.length || 0}
            </span>
          </div>
        </div>
        {/* Show first few tasks as simple text */}
        {s.tasks && s.tasks.length > 0 && (
          <div style={{ marginLeft: '16px', marginTop: '4px' }}>
            {s.tasks.slice(0, 3).map((t: any, i: number) => (
              <div key={i} style={{
                fontSize: '0.85em',
                color: '#555',
                marginBottom: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span className="material-icons" style={{ fontSize: '14px', color: '#999' }}>
                  check_box_outline_blank
                </span>
                <span>{t.title}</span>
              </div>
            ))}
            {s.tasks.length > 3 && (
              <div style={{
                fontSize: '0.8em',
                color: '#999',
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                ... and {s.tasks.length - 3} more tasks
              </div>
            )}
          </div>
        )}
      </div>
    );
  });

  // Modified subprojects - show new tasks as simple text
  modSubs.forEach((ms: any) => {
    const os = origSubs.find((s: any) => s.id === ms.id);
    if (!os) return; // already handled as new

    const origTasks = os.tasks || [];
    const modTasks = ms.tasks || [];
    const newTasks = modTasks.filter((mt: any) => !origTasks.find((ot: any) => ot.id === mt.id));

    if (newTasks.length > 0) {
      changes.push(
        <div key={`new-tasks-${ms.id}`} style={{ marginBottom: '8px' }}>
          <div style={{
            fontSize: '0.85em',
            color: '#666',
            marginBottom: '4px',
            fontWeight: '500'
          }}>
            ➕ Add {newTasks.length} task{newTasks.length > 1 ? 's' : ''} to "{ms.title}":
          </div>
          <div style={{
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            padding: '8px',
            backgroundColor: '#fafafa'
          }}>
            {newTasks.slice(0, 5).map((t: any, i: number) => (
              <div key={i} style={{
                fontSize: '0.85em',
                color: '#555',
                marginBottom: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span className="material-icons" style={{ fontSize: '14px', color: '#999' }}>
                  check_box_outline_blank
                </span>
                <span>{t.title}</span>
              </div>
            ))}
            {newTasks.length > 5 && (
              <div style={{
                fontSize: '0.8em',
                color: '#999',
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                ... and {newTasks.length - 5} more tasks
              </div>
            )}
          </div>
        </div>
      );
    }
  });

  // Overview changes - keep as text for now
  const overviewChanges: string[] = [];
  if (modified.name !== original.name) {
    overviewChanges.push(`📝 **Project name:** "${original.name}" → "${modified.name}"`);
  }
  if (modified.goal !== original.goal) {
    const old = original.goal || '(none)';
    const new_ = modified.goal || '(none)';
    overviewChanges.push(`🎯 **Goal:** "${old}" → "${new_}"`);
  }
  if (modified.description !== original.description) {
    const old = original.description || '(none)';
    const new_ = modified.description || '(none)';
    overviewChanges.push(`📖 **Description:** "${old}" → "${new_}"`);
  }
  if (modified.end_date !== original.end_date) {
    const old = original.end_date || '(none)';
    const new_ = modified.end_date || '(none)';
    overviewChanges.push(`📅 **End date:** "${old}" → "${new_}"`);
  }
  if (modified.special_instructions !== original.special_instructions) {
    const old = original.special_instructions || '(none)';
    const new_ = modified.special_instructions || '(none)';
    overviewChanges.push(`🧠 **Special instructions:** "${old}" → "${new_}"`);
  }

  return (
    <div style={{ marginTop: '12px', marginBottom: '12px' }}>
      {overviewChanges.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            fontSize: '0.9em',
            fontWeight: '600',
            color: '#2c3e50',
            marginBottom: '6px'
          }}>
            📋 Project Changes:
          </div>
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '6px',
            padding: '8px'
          }}>
            {overviewChanges.map((change, i) => (
              <div key={i} style={{ marginBottom: '4px', fontSize: '0.85em' }}>
                {change.split('**').map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.length > 0 && (
        <div>
          <div style={{
            fontSize: '0.9em',
            fontWeight: '600',
            color: '#2c3e50',
            marginBottom: '6px'
          }}>
            🎯 Content Changes:
          </div>
          {changes}
        </div>
      )}
    </div>
  );
};

// Simple text renderer for assistant messages with basic formatting
const FormattedText = ({ text }: { text: string }) => {
  // Split by newlines and render with proper spacing
  const lines = text.split('\n').map((line, i) => {
    // Handle indentation for visual tree structure (new lists)
    if (line.startsWith('   ├─') || line.startsWith('   └─')) {
      return (
        <div key={i} style={{
          marginLeft: '1.2em',
          fontFamily: 'monospace',
          fontSize: '0.9em',
          color: '#666',
          borderLeft: '2px solid #e0e0e0',
          paddingLeft: '0.5em',
          marginBottom: '2px',
          paddingBottom: '1px'
        }}>
          {line}
        </div>
      );
    }
    // Handle bullet points for new tasks
    if (line.startsWith('   •')) {
      return (
        <div key={i} style={{
          marginLeft: '1.5em',
          fontSize: '0.9em',
          color: '#555',
          marginBottom: '2px',
          paddingBottom: '1px'
        }}>
          {line}
        </div>
      );
    }
    // Handle bold text with ** markers
    if (line.includes('**')) {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={i} style={{ marginBottom: '6px', fontSize: '0.95em' }}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} style={{
                fontWeight: '600',
                color: '#2c3e50'
              }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </div>
      );
    }
    return <div key={i} style={{ marginBottom: '4px', fontSize: '0.95em' }}>{line}</div>;
  });

  return <div style={{ lineHeight: '1.5' }}>{lines}</div>;
};

// ── Feature flag ─────────────────────────────────────────────────────────────
// When true the LLM returns the full edited project JSON instead of discrete
// action objects. The old action-based path is still present but unreachable
// while this is true. Flip to false to revert to the old behaviour.
const AI_JSON_MODE = true;
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  projectExport: any;
  onClose: () => void;
  onApplyChange?: ((projectId: string, updated: any) => void) | undefined;
  project?: any;
  onAddSubproject: (title: string) => void;
  providerLabel?: string | null;
}

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  meta?: any;
}

export default function ProjectAssistant({ projectExport, onClose, onApplyChange, project, onAddSubproject, providerLabel }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [appliedActionIds, setAppliedActionIds] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  const onApplyBlueprint = (patch: any) => {
    try {
      if (patch && typeof patch === 'object') {
        const actionName = String(patch.action || patch.type || '').toLowerCase();
        if ((actionName === 'add_task' || actionName === 'add-task' || actionName === 'addtask') && patch.payload) {
          const title = patch.payload.title || patch.payload.text || patch.payload.description || 'New Item';
          const targetNameOrId = patch.payload.subprojectId || patch.payload.subproject || patch.payload.listName || null;
          const existingSubs = [...(project?.subprojects || [])];
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
          
          const newTask = { id: `ai-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: title, description: title, people: [], done: false, favorite: false, dueDate: null };
          let updatedSubprojects = existingSubs;
          if (targetSub) {
            updatedSubprojects = updatedSubprojects.map((s: any) => String(s.id) === String(targetSub?.id) ? { ...s, tasks: [...(s.tasks || []), newTask] } : s);
          } else {
            const newSubName = targetNameOrId || 'General List';
            const newSub = { id: `ai-sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: newSubName, title: newSubName, tasks: [newTask] };
            updatedSubprojects = [...existingSubs, newSub];
          }
          onApplyChange?.(project?.id, { subprojects: updatedSubprojects });
        } else if ((actionName === 'batch_actions' || actionName === 'batch_update' || actionName === 'batchupdate') && (Array.isArray(patch.payload?.actions) || Array.isArray(patch.payload))) {
          let updatedSubprojects = [...(project?.subprojects || [])];
          const actionsToProcess = Array.isArray(patch.payload?.actions) ? patch.payload.actions : patch.payload;
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
                const newTask = { id: `ai-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: title, description: title, people: [], done: false, favorite: false, dueDate: null };
                if (targetSub) {
                  updatedSubprojects = updatedSubprojects.map((s: any) => String(s.id) === String(targetSub?.id) ? { ...s, tasks: [...(s.tasks || []), newTask] } : s);
                } else {
                  const newSubName = targetNameOrId || 'General List';
                  const newSub = { id: `ai-sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: newSubName, title: newSubName, tasks: [newTask] };
                  updatedSubprojects = [...updatedSubprojects, newSub];
                }
             } else if ((subActionName === 'add_subproject' || subActionName === 'add-subproject' || subActionName === 'addsubproject') && subPayload) {
                const title = subPayload.title || subPayload.text || subPayload.description || 'New List';
                const newSub = { id: `ai-sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: title, title: title, tasks: [] };
                updatedSubprojects = [...updatedSubprojects, newSub];
             } else if (['move_task', 'move-task', 'movetask'].includes(subActionName) && subPayload) {
               const taskId = subPayload.taskId || subPayload.id || subPayload.taskID;
               const toNameOrId = subPayload.toSubprojectId || subPayload.to || subPayload.subprojectId || subPayload.listName;
               if (taskId && toNameOrId) {
                 let movedTask: any = null;
                 updatedSubprojects = updatedSubprojects.map((s: any) => {
                   const idx = (s.tasks || []).findIndex((t: any) => String(t.id) === String(taskId));
                   if (idx === -1) return s;
                   movedTask = (s.tasks || [])[idx];
                   return { ...s, tasks: (s.tasks || []).filter((_: any, i: number) => i !== idx) };
                 });
                 if (movedTask) {
                   const tn = String(toNameOrId).toLowerCase();
                   const targetSub = updatedSubprojects.find((s: any) => String(s.id) === tn || (s.title || s.text || '').toLowerCase().includes(tn));
                   if (targetSub) {
                     updatedSubprojects = updatedSubprojects.map((s: any) => String(s.id) === String(targetSub.id) ? { ...s, tasks: [...(s.tasks || []), movedTask] } : s);
                   } else {
                     const newSub = { id: `ai-sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: toNameOrId, title: toNameOrId, tasks: [movedTask] };
                     updatedSubprojects = [...updatedSubprojects, newSub];
                   }
                 }
               }
             } else if ((subActionName === 'edit-task' || subActionName === 'edit_task' || subActionName === 'edittask') && subPayload) {
               const taskId = subPayload.taskId || subPayload.id || subPayload.taskID;
               const taskTitle = (subPayload.title || subPayload.text || '').trim().toLowerCase();
               console.log('[AI edit_task] taskId:', taskId, 'title:', taskTitle, 'payload:', subPayload);
               if (taskId || taskTitle) {
                 let matched = false;
                 updatedSubprojects = updatedSubprojects.map((s: any) => ({
                    ...s,
                    tasks: (s.tasks || []).map((t: any) => {
                      // Match by ID first, fall back to title match
                      const idMatch = taskId && String(t.id) === String(taskId);
                      const titleMatch = !idMatch && taskTitle && (t.text || t.description || '').trim().toLowerCase() === taskTitle;
                      if (!idMatch && !titleMatch) return t;
                      matched = true;
                      console.log('[AI edit_task] matched task:', t.id, t.text, 'effort before:', t.effort, 'effort payload:', subPayload.effort);
                      const updatedTask = { ...t };
                      // Only update title if explicitly provided AND different from current (avoids renaming via fallback title match)
                      const newTitle = taskId ? (subPayload.text || subPayload.title) : null;
                      if (newTitle && newTitle !== t.text) {
                        updatedTask.text = newTitle;
                        updatedTask.description = newTitle;
                      } else if (!taskId && subPayload.description && subPayload.description !== t.description) {
                        updatedTask.description = subPayload.description;
                      }
                      if (subPayload.done !== undefined) updatedTask.done = !!subPayload.done;
                      if (subPayload.effort !== undefined) updatedTask.effort = normalizeEffort(subPayload.effort);
                      if (subPayload.dueDate !== undefined) updatedTask.dueDate = subPayload.dueDate;
                      if (subPayload.assignee !== undefined) updatedTask.assignee = subPayload.assignee;
                      console.log('[AI edit_task] effort after:', updatedTask.effort);
                      return updatedTask;
                    })
                 }));
                 if (!matched) console.warn('[AI edit_task] NO MATCH FOUND for taskId:', taskId, 'title:', taskTitle);
               }
             }
          };

          actionsToProcess.forEach((a: any) => {
            if (a && typeof a === 'object') {
               processAction(String(a.action || a.type || '').toLowerCase(), a.payload);
            }
          });
          console.log('[AI batch_update] calling onApplyChange with subprojects:', JSON.stringify(updatedSubprojects).slice(0, 500));
          onApplyChange?.(project?.id, { subprojects: updatedSubprojects });
        } else if (['move_task', 'move-task', 'movetask'].includes(actionName) && patch.payload) {
          const taskId = patch.payload.taskId || patch.payload.id || patch.payload.taskID;
          const toNameOrId = patch.payload.toSubprojectId || patch.payload.to || patch.payload.subprojectId || patch.payload.listName;
          if (taskId && toNameOrId) {
            let movedTask: any = null;
            let updatedSubprojects = (project?.subprojects || []).map((s: any) => {
              const idx = (s.tasks || []).findIndex((t: any) => String(t.id) === String(taskId));
              if (idx === -1) return s;
              movedTask = s.tasks[idx];
              return { ...s, tasks: s.tasks.filter((_: any, i: number) => i !== idx) };
            });
            if (movedTask) {
              const tn = String(toNameOrId).toLowerCase();
              const targetSub = updatedSubprojects.find((s: any) => String(s.id) === tn || (s.title || s.text || '').toLowerCase().includes(tn));
              if (targetSub) {
                updatedSubprojects = updatedSubprojects.map((s: any) => String(s.id) === String(targetSub.id) ? { ...s, tasks: [...(s.tasks || []), movedTask] } : s);
              } else {
                const newSub = { id: `ai-sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: toNameOrId, title: toNameOrId, tasks: [movedTask] };
                updatedSubprojects = [...updatedSubprojects, newSub];
              }
              onApplyChange?.(project?.id, { subprojects: updatedSubprojects });
            }
          }
        } else if ((actionName === 'remove-task' || actionName === 'remove_task' || actionName === 'removetask') && patch.payload) {
          const taskId = patch.payload.taskId || patch.payload.id || patch.payload.taskID;
          if (taskId) {
            const updatedSubprojects = (project?.subprojects || []).map((s: any) => ({
              ...s,
              tasks: (s.tasks || []).filter((t: any) => String(t.id) !== String(taskId))
            }));
            onApplyChange?.(project?.id, { subprojects: updatedSubprojects });
          }
        } else if ((actionName === 'remove_subproject' || actionName === 'remove-subproject') && patch.payload) {
          const subId = patch.payload.subprojectId || patch.payload.id;
          if (subId) {
            const updatedSubprojects = (project?.subprojects || []).filter((s: any) => String(s.id) !== String(subId));
            onApplyChange?.(project?.id, { subprojects: updatedSubprojects });
          }
        } else if ((actionName === 'edit-task' || actionName === 'edit_task' || actionName === 'edittask') && patch.payload) {
          const taskId = patch.payload.taskId || patch.payload.id || patch.payload.taskID;
          const taskTitle = (patch.payload.title || patch.payload.text || '').trim().toLowerCase();
          console.log('[AI edit_task top-level] taskId:', taskId, 'title:', taskTitle, 'payload:', patch.payload);
          if (taskId || taskTitle) {
            const updatedSubprojects = (project?.subprojects || []).map((s: any) => ({
              ...s,
              tasks: (s.tasks || []).map((t: any) => {
                const idMatch = taskId && String(t.id) === String(taskId);
                const titleMatch = !idMatch && taskTitle && (t.text || t.description || '').trim().toLowerCase() === taskTitle;
                if (!idMatch && !titleMatch) return t;
                const updated = { ...t };
                const newTitle = taskId ? (patch.payload.text || patch.payload.title) : null;
                if (newTitle && newTitle !== t.text) {
                  updated.text = newTitle;
                  updated.description = newTitle;
                }
                if (patch.payload.done !== undefined) updated.done = !!patch.payload.done;
                if (patch.payload.effort !== undefined) updated.effort = normalizeEffort(patch.payload.effort);
                if (patch.payload.dueDate !== undefined) updated.dueDate = patch.payload.dueDate;
                if (patch.payload.assignee !== undefined) updated.assignee = patch.payload.assignee;
                return updated;
              })
            }));
            onApplyChange?.(project?.id, { subprojects: updatedSubprojects });
          }
        } else {
          onApplyChange?.(project?.id, patch);
        }
      }
    } catch (err) {
      console.error("Error applying patch from assistant", err);
    }
  };


  const genId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Convert visual preview to text for clipboard sharing
  const previewToText = (modified: any, original: any): string => {
    const lines: string[] = [];

    const origSubs = original.sub_projects || [];
    const modSubs = modified.sub_projects || [];

    // New subprojects
    const newSubs = modSubs.filter((ms: any) => !origSubs.find((os: any) => os.id === ms.id));
    newSubs.forEach((s: any) => {
      lines.push(`📋 New list: "${s.title}" (${s.tasks?.length || 0} tasks)`);
      if (s.tasks && s.tasks.length > 0) {
        s.tasks.slice(0, 5).forEach((t: any) => {
          const effort = t.effort ? ` (${t.effort}d)` : '';
          lines.push(`   • ${t.title}${effort}`);
        });
        if (s.tasks.length > 5) {
          lines.push(`   • ... and ${s.tasks.length - 5} more tasks`);
        }
      }
    });

    // New tasks in existing subprojects
    modSubs.forEach((ms: any) => {
      const os = origSubs.find((s: any) => s.id === ms.id);
      if (!os) return;

      const origTasks = os.tasks || [];
      const modTasks = ms.tasks || [];
      const newTasks = modTasks.filter((mt: any) => !origTasks.find((ot: any) => ot.id === mt.id));

      if (newTasks.length > 0) {
        lines.push(`➕ Add ${newTasks.length} task${newTasks.length > 1 ? 's' : ''} to "${ms.title}":`);
        newTasks.slice(0, 5).forEach((t: any) => {
          const effort = t.effort ? ` (${t.effort}d)` : '';
          lines.push(`   • ${t.title}${effort}`);
        });
        if (newTasks.length > 5) {
          lines.push(`   • ... and ${newTasks.length - 5} more tasks`);
        }
      }
    });

    // Overview changes
    if (modified.name !== original.name) {
      lines.push(`📝 Project name: "${original.name}" → "${modified.name}"`);
    }
    if (modified.goal !== original.goal) {
      const old = original.goal || '(none)';
      const new_ = modified.goal || '(none)';
      lines.push(`🎯 Goal: "${old}" → "${new_}"`);
    }
    if (modified.description !== original.description) {
      const old = original.description || '(none)';
      const new_ = modified.description || '(none)';
      lines.push(`📖 Description: "${old}" → "${new_}"`);
    }
    if (modified.end_date !== original.end_date) {
      const old = original.end_date || '(none)';
      const new_ = modified.end_date || '(none)';
      lines.push(`📅 End date: "${old}" → "${new_}"`);
    }
    if (modified.special_instructions !== original.special_instructions) {
      const old = original.special_instructions || '(none)';
      const new_ = modified.special_instructions || '(none)';
      lines.push(`🧠 Special instructions: "${old}" → "${new_}"`);
    }

    return lines.join('\n');
  };
  const normalizeEffort = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim().toLowerCase();
    if (!s) return null;
    // hours: "4h", "4 hours", "4 hr"
    const hoursMatch = s.match(/^([\d.]+)\s*h/);
    if (hoursMatch && hoursMatch[1]) return Math.round((parseFloat(hoursMatch[1]) / 8) * 10) / 10;
    // minutes
    const minsMatch = s.match(/^([\d.]+)\s*m/);
    if (minsMatch && minsMatch[1]) return Math.round((parseFloat(minsMatch[1]) / 480) * 10) / 10;
    // plain number or "2 days"
    const numMatch = s.match(/^([\d.]+)/);
    if (numMatch && numMatch[1]) return parseFloat(numMatch[1]);
    return null;
  };

  const extractTitleFromLabel = (label: string) => {
    if (!label) return 'New Item';
    const q = label.match(/['"]([^'"]+)['"]/);
    if (q && q[1]) return q[1];
    const m = label.match(/add\s+(.+?)\s+to\s+/i);
    if (m && m[1]) return m[1].trim();
    return label;
  }

  /**
   * JSON-mode apply: takes the LLM-returned modified project structure and
   * merges it back onto the real project, preserving every field the LLM
   * doesn't know about (favorite, people, starred, done, dueDate, etc.).
   * Also maps slim field names (end_date, special_instructions) back to real names.
   */
  const mergeAIProjectBack = (modifiedProject: any): any => {
    const originalSubs: any[] = project?.subprojects || [];
    const modifiedSubs: any[] = modifiedProject?.sub_projects || modifiedProject?.subprojects || [];

    const updatedSubprojects = modifiedSubs.map((mSub: any) => {
      const origSub = originalSubs.find((s: any) => s.id === mSub.id);
      const origTasks: any[] = origSub?.tasks || [];
      const modifiedTasks: any[] = mSub.tasks || [];

      const updatedTasks = modifiedTasks.map((mTask: any) => {
        const origTask = origTasks.find((t: any) => t.id === mTask.id);
        if (origTask) {
          // Merge: apply AI-modified fields, preserve everything else
          return {
            ...origTask,
            text: mTask.title ?? mTask.text ?? origTask.text,
            description: mTask.title ?? mTask.text ?? origTask.description,
            effort: mTask.effort !== undefined ? normalizeEffort(mTask.effort) : origTask.effort,
          };
        } else {
          // New task added by the LLM
          return {
            id: mTask.id || genId('task'),
            text: mTask.title || mTask.text || 'New Task',
            description: mTask.title || mTask.text || '',
            done: false,
            effort: normalizeEffort(mTask.effort),
            dueDate: null,
            favorite: false,
            people: [],
          };
        }
      });

      if (origSub) {
        return { ...origSub, text: mSub.title ?? mSub.text ?? origSub.text, tasks: updatedTasks };
      } else {
        return {
          id: mSub.id || genId('sub'),
          text: mSub.title || mSub.text || 'New List',
          isProjectLevel: false,
          tasks: updatedTasks,
        };
      }
    });

    // Build the result with subprojects, then map overview fields back to real field names
    const result: any = { subprojects: updatedSubprojects };
    if (modifiedProject.goal !== undefined) result.goal = modifiedProject.goal;
    if (modifiedProject.description !== undefined) result.description = modifiedProject.description;
    if (modifiedProject.end_date !== undefined) result.dueDate = modifiedProject.end_date;
    if (modifiedProject.special_instructions !== undefined) result.aiInstructions = modifiedProject.special_instructions;
    return result;
  };

  const normalizeAction = (a: any) => {
    if (!a) return a;
    if (typeof a === 'string') {
      const label = a;
      const title = extractTitleFromLabel(label);
      return { type: 'add_task', label, payload: { title, description: title } };
    }
    let type = (a.type || a.action || a.kind || '').toString();
    // normalize common provider button types to add_task
    if (type.toLowerCase() === 'button' || type.toLowerCase() === 'add_to_list' || type.toLowerCase() === 'add-to-list') type = 'add_task';
    if (type.toLowerCase() === 'add-task') type = 'add_task';
    const payload = { ...(a.payload || {}) };
    // Only inject a fallback title for add_task — NOT for edit_task (where title is optional;
    // injecting it would accidentally rename the task to the action label string)
    const isAddAction = type === 'add_task';
    if (isAddAction) {
      payload.title = payload.title || payload.description || payload.text || extractTitleFromLabel(a.label || '');
      if (payload.description === undefined && payload.title) payload.description = payload.title;
    }

    let label = a.label;
    // For batch actions always derive label from action count (ignore any LLM-generated label)
    if (type === 'batch_update' || type === 'batch_actions') {
      const actionCount = Array.isArray(payload.actions) ? payload.actions.length : 0;
      label = a.label && a.label !== type ? a.label : (actionCount > 0 ? `Apply ${actionCount} Changes` : 'Apply Multiple Changes');
    } else if (!label || label === type) {
      if (type === 'add_subproject') {
        label = `Add new list: ${payload.title || 'New List'}`;
      } else if (type === 'add_task') {
        label = `Add ${payload.title || 'item'}`;
      } else if (type === 'remove_task') {
        label = `Remove ${payload.taskId || 'item'}`;
      } else {
        label = 'Apply Action';
      }
    }

    return { ...a, type, payload, label };
  }

  useEffect(() => {
    // seed system message
    setMessages([{ id: 'sys-1', role: 'assistant', text: "Hi! I'm the FOMO Helper. How can I help you manage this project today?" }]);
  }, []);

  useEffect(() => {
    // scroll to bottom
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    setInput("");

    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text, project: projectExport, history: messages.map(x=>({role:x.role,text:x.text})), jsonMode: AI_JSON_MODE })
      });
      const data = await resp.json();
      if (data.error) {
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: `Error: ${data.error}` }]);
      } else if (AI_JSON_MODE) {
        // ── JSON mode: the LLM returned a modified_project directly ──────────
        let assistantText = data.text || 'Here are the suggested changes:';
        let modified = data.modified_project ?? null;
        // Safety net: if groq.ts JSON parse failed, data.text may be the raw JSON string
        if (!modified && typeof assistantText === 'string' && assistantText.trimStart().startsWith('{')) {
          try {
            const jsonStart = assistantText.indexOf('{');
            const jsonEnd = assistantText.lastIndexOf('}');
            const raw = JSON.parse(assistantText.slice(jsonStart, jsonEnd + 1));
            if (raw.modified_project) {
              modified = raw.modified_project;
              assistantText = String(raw.text || 'Here are the suggested changes:');
            }
          } catch (_) { /* ignore */ }
        }
        // Only show Apply Changes if modified_project is non-null and actually differs from what was sent
        const originalJson = JSON.stringify(projectExport);
        const hasRealChanges = modified && JSON.stringify(modified) !== originalJson;
        setMessages((m) => [...m, {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: assistantText,
          meta: hasRealChanges ? { 
            modified_project: modified,
            preview_component: <ChangePreview modified={modified} original={projectExport} />
          } : undefined,
        }]);
      } else {
        let assistantText = data.text || 'Response received.';
        // normalize actions: provider may return structured `actions` or JSON embedded in `text`
        let actions = Array.isArray(data.actions) ? data.actions : null;
        if (typeof assistantText === 'string') {
          // extract JSON parts manually to handle both complete and truncated JSON blobs
          const textMatch = assistantText.match(/"text"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
            if (textMatch && textMatch[1]) {
            assistantText = textMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
            const actionsMatch = data.text?.match(/"actions"\s*:\s*(\[\s*\{.*(?:\}|\]))/s);
            if (actionsMatch && !actions) {
               let actionsStr = actionsMatch[1];
               for (let i=0; i<10; i++) {
                 try {
                   const parsed = JSON.parse(actionsStr);
                   if (Array.isArray(parsed)) { actions = parsed; break; }
                 } catch(e) {
                   actionsStr += i % 3 === 0 ? ']' : '}'; // attempt to balance brackets
                 }
               }
            }
          } else {
            // try to find and parse a complete JSON blob inside the assistant text if textMatch failed
            const jsonMatch = assistantText.match(/```json\s*(\{[\s\S]*?\})\s*```/) || assistantText.match(/(\{[\s\S]*"actions"[\s\S]*\})/);
            if (jsonMatch && jsonMatch[1]) {
              try {
                const parsed = JSON.parse(jsonMatch[1]);
                if (parsed && Array.isArray(parsed.actions)) {
                  if (!actions) actions = parsed.actions;
                  assistantText = assistantText.replace(jsonMatch[0], '').trim() || parsed.text || 'Response received.';
                }
              } catch (e) {
                // ignore parse errors
              }
            } else if (!actions && assistantText.indexOf('{') !== -1) {
              const jsonStart = assistantText.indexOf('{');
              const maybeJson = assistantText.slice(jsonStart);
              try {
                const parsed = JSON.parse(maybeJson);
                if (parsed && Array.isArray(parsed.actions)) {
                  actions = parsed.actions;
                  assistantText = assistantText.slice(0, jsonStart).trim() || parsed.text || 'Response received.';
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }
        const hasActions = Array.isArray(actions) && actions.length > 0;
        if (hasActions) {
          const claimRegex = /(I('|’)ve|I have|I added|Added|I've added)\b/i;
          if (claimRegex.test(assistantText)) {
            assistantText = 'I suggest the following actions. Click an action to apply it to the project.';
          } else {
            assistantText = assistantText ? `${assistantText}\n\nSuggested actions:` : 'Suggested actions:';
          }
        }
        let normalized = Array.isArray(actions) ? actions.map(normalizeAction) : (Array.isArray(data.actions) ? data.actions.map(normalizeAction) : []);
        const validTypes = new Set([
          'add_subproject', 'remove_subproject', 'remove-subproject',
          'update_project', 'apply_patch', 'copy_text', 'suggestion',
          'add_task', 'add-task', 'add-row', 'add_to_list',
          'remove_task', 'remove-task', 'remove', 'removetask',
          'edit_task', 'edit-task', 'edit', 'edittask',
          'move_task', 'move-task', 'movetask',
          'batch_actions', 'batch_update', 'batchupdate'
        ]);
        normalized = normalized.filter((a: any) => a && a.type && validTypes.has(String(a.type).toLowerCase()));
        
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: assistantText, meta: { actions: normalized } }]);
      } // end else (actions mode)
    } catch (err: any) {
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: `Error: ${String(err)}` }]);
    } finally {
      setLoading(false);
    }
  }

  const copyConversation = async () => {
    try {
      const text = messages.map((m, index) => {
        let txt = `${m.role.toUpperCase()}: ${m.text}`;
        if (m.meta && Array.isArray(m.meta.actions) && m.meta.actions.length) {
          const labels = m.meta.actions.map((act: any) => (typeof act === 'string' ? act : (act.label || act.type || JSON.stringify(act))));
          txt += '\n\nActions:\n' + labels.map((l: string) => `- ${l}`).join('\n');
        }
        // Include visual preview as text for LLM sharing
        if (m.meta?.preview_component) {
          // Find the modified_project from the current message
          const modifiedProject = m.meta.modified_project;
          if (modifiedProject) {
            const previewText = previewToText(modifiedProject, projectExport);
            if (previewText) {
              txt += '\n\n[Visual Preview]\n' + previewText;
            }
            // Add button representation
            txt += '\n\n[[Apply Changes]]';
          }
        }
        return txt;
      }).join('\n\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  }

  return (
    <div className="assistant-modal" role="dialog" aria-modal="true">
      <div className="assistant-backdrop" onClick={onClose} />
      <div className="assistant-panel">
        <div className="assistant-header">
          <div className="assistant-header-left">
            <span className="material-icons assistant-header-icon">auto_awesome</span>
            <div className="assistant-header-title">
              <h3>FOMO AI Assistant</h3>
              {providerLabel && <span className="assistant-provider-label">Powered by {providerLabel}</span>}
            </div>
          </div>
          <div className="assistant-header-right">
            <button className="copy-btn" onClick={copyConversation} aria-label="Copy conversation">
              <span className="material-icons">content_copy</span>
            </button>
            {copied ? <span className="copied-badge" aria-live="polite">Copied!</span> : null}
            <button className="close-btn" onClick={onClose} aria-label="Close">
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        <div className="assistant-body" ref={listRef}>
          {messages.map((m) => (
            <div key={m.id} className={`assistant-message assistant-message--${m.role}`}>
              <div className="assistant-message__text">
                {m.text ? <FormattedText text={m.text} /> : null}
                {m.meta?.preview_component}
              </div>

              {/* ── JSON mode: single Apply Changes button ── */}
              {AI_JSON_MODE && m.role === 'assistant' && m.meta?.preview_component && m.meta?.modified_project && (
                <div className="assistant-actions">
                  <button
                    className={`assistant-action${appliedActionIds[m.id] ? ' assistant-action--applied' : ''}`}
                    disabled={!!appliedActionIds[m.id]}
                    onClick={() => {
                      if (appliedActionIds[m.id]) return;
                      const merged = mergeAIProjectBack(m.meta!.modified_project);
                      onApplyChange?.(project?.id, merged);
                      setAppliedActionIds((prev) => ({ ...prev, [m.id]: true }));
                      setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: 'Changes applied.' }]);
                    }}
                  >
                    {appliedActionIds[m.id] ? '✓ Applied' : 'Apply Changes'}
                  </button>
                </div>
              )}

              {/* ── Actions mode (legacy, AI_JSON_MODE = false) ── */}
              {!AI_JSON_MODE && m.role === 'assistant' && m.meta && Array.isArray(m.meta.actions) && (
                <div className="assistant-actions">
                  {m.meta.actions.map((a: any, i:number) => {
                    const action = normalizeAction(a);
                    const actionId = action.id || `${i}-${String(action.type)}`;
                    const disabled = !!appliedActionIds[actionId];
                    return (
                      <button
                        key={actionId}
                        onClick={() => {
                          if (disabled) return;
                          setAppliedActionIds((prev) => ({ ...prev, [actionId]: true }));
                          if (action.type === 'add_subproject') {
                            const title = action.payload?.title || action.label || 'New Subproject';
                            onAddSubproject(title);
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Added subproject: ${title}` }]);
                          } else if ((action.type === 'update_project' || action.type === 'apply_patch') && action.payload) {
                            onApplyBlueprint?.(action.payload);
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Applied suggested project update.` }]);
                          } else if (action.type === 'copy_text') {
                            const txt = action.payload?.text || action.label || '';
                            if (txt) {
                              try { navigator.clipboard.writeText(txt); } catch {}
                              setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Copied text to clipboard.` }]);
                            }
                          } else if (action.type === 'suggestion') {
                            // handle generic suggestions payloads { items: string[] } by adding them to a TV List
                            const items: string[] = action.payload?.items || (Array.isArray(action.payload) ? action.payload : []);
                            if (items && items.length > 0) {
                              // build new tasks for each suggestion
                              const newTasks = items.map((it) => ({ id: genId('task'), description: it }));
                              // find existing tv list subproject in projectExport
                              const existingSubs = (projectExport?.sub_projects || []).map((s: any) => ({
                                id: s.id || genId('sub'),
                                title: s.title || s.text || '',
                                isProjectLevel: !!s.isProjectLevel,
                                description: s.description || null,
                                color: s.color || null,
                                owners: s.owners || null,
                                tasks: (s.tasks || []).map((t: any) => ({ id: t.id || genId('task'), description: t.description || t.text || '' }))
                              }));
                              let tvSub = existingSubs.find((s: any) => (s.title || '').toLowerCase().includes('tv'));
                              let updatedSubs = existingSubs;
                              if (tvSub) {
                                updatedSubs = existingSubs.map((s: any) => s.id === tvSub.id ? { ...s, tasks: [...(s.tasks || []), ...newTasks] } : s);
                              } else {
                                const newSub = { id: genId('sub'), title: 'TV List', isProjectLevel: false, description: null, color: null, owners: null, tasks: newTasks };
                                updatedSubs = [...existingSubs, newSub];
                              }
                              // send patch to parent to apply
                              onApplyBlueprint?.({ subprojects: updatedSubs });
                              setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Added ${items.length} suggestion(s) to TV List.` }]);
                            } else {
                              // fallback: copy the suggestion text to clipboard
                              const txt = action.payload?.text || action.label || '';
                              if (txt) {
                                try { navigator.clipboard.writeText(txt); } catch {}
                                setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Copied suggestion text to clipboard.` }]);
                              } else {
                                setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Suggestion received.` }]);
                              }
                            }
                          } else if (action.type === 'add_task' || action.type === 'add-task' || action.type === 'add-row' || action.type === 'add_task' || action.type === 'add_to_list') {
                            // Forward generic add task action (already normalized)
                            onApplyBlueprint?.(action);
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Successfully added task: "${action.payload?.title || action.label || 'item'}".` }]);
                          } else if (action.type === 'remove_subproject' || action.type === 'remove-subproject') {
                            onApplyBlueprint?.(action);
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Successfully removed subproject.` }]);
                          } else if (action.type === 'remove-task' || action.type === 'remove_task' || action.type === 'remove' || action.type === 'removeTask') {
                            onApplyBlueprint?.(action);
                            const itemName = action.payload?.title || action.payload?.description || action.payload?.taskId || action.payload?.id || 'item';
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Successfully removed task: "${itemName}".` }]);
                          } else if (action.type === 'edit-task' || action.type === 'edit_task' || action.type === 'edit') {
                            onApplyBlueprint?.(action);
                            const itemName = action.payload?.title || action.payload?.description || action.payload?.taskId || action.payload?.id || 'item';
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Successfully edited task: "${itemName}".` }]);
                          } else if (action.type === 'batch_actions' || action.type === 'batch_update' || action.type === 'batchupdate') {
                            onApplyBlueprint?.(action);
                            let details = "Successfully applied bulk actions.";
                            const arr = Array.isArray(action.payload?.actions) ? action.payload.actions : Array.isArray(action.payload) ? action.payload : null;
                            if (arr) {
                              const affected = arr
                                .map((sub: any) => sub.payload?.title || sub.payload?.description || sub.payload?.text || sub.payload?.taskId || sub.payload?.id)
                                .filter(Boolean);
                              if (affected.length > 0) {
                                details = `Successfully applied bulk actions on: ${affected.join(', ')}.`;
                              }
                            }
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: details }]);
                          } else {
                            console.warn('Unknown action type', action);
                            setMessages((mm) => [...mm, { id: `sys-${Date.now()}`, role: 'system', text: `Unknown action: ${action.type}` }]);
                          }
                        }}
                        disabled={disabled}
                        className="assistant-action"
                      >{action.label}</button>
                    );
                  })}
                </div>
              )} {/* end actions mode */}
            </div>
          ))}

          {messages.length === 1 && messages[0]?.role === 'assistant' && (
            <div className="assistant-suggestions">
              {[
                'Create a list of recommended 80s movies',
                'Remove tasks that sound like they take too long',
                'Add estimated effort to each task',
              ].map((s) => (
                <button
                  key={s}
                  className="assistant-suggestion-chip"
                  onClick={() => { setInput(s); setTimeout(() => sendMessage(s), 0); }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

        </div>

        <div className="assistant-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="Ask the assistant to modify this project (e.g., 'Add a QA subproject with 3 tasks')"
            aria-label="Message"
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}>Send</button>
        </div>
      </div>

      <style jsx>{`
        .assistant-modal { position: fixed; inset: 0; z-index: 12000; display: flex; align-items: center; justify-content: center; }
        .assistant-backdrop { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); } 
        .assistant-panel { 
          position: relative;
          background: #fafafa;
          width: 850px; height: 85vh;
          max-width: 95vw; max-height: 95vh;
          border-radius: 16px;
          display: flex; flex-direction: column;
          font-family: Roboto, "Helvetica Neue", Arial, sans-serif;
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
        }
        .assistant-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; height: 64px; min-height: 64px;
          background: linear-gradient(135deg, #1a73e8, #8ab4f8); color: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 10;
          border-radius: 16px 16px 0 0;
        }
        .assistant-header-left {
          display: flex; align-items: center; gap: 12px;
        }
        .assistant-header-right {
          display: flex; gap: 8px; align-items: center;
        }
        .assistant-header-icon { font-size: 1.5rem; }
        .assistant-header h3 { margin: 0; font-size: 1.25rem; font-weight: 500; letter-spacing: 0.5px; }
        .assistant-header-title { display: flex; flex-direction: column; gap: 1px; }
        .assistant-provider-label { font-size: 0.65rem; color: rgba(255,255,255,0.55); font-weight: 400; letter-spacing: 0.3px; margin: 0; line-height: 1.2; }
        .copy-btn, .close-btn {
          background: transparent; border: none; color: white;
          width: 40px; height: 40px; border-radius: 50%;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; transition: background 0.2s ease, transform 0.1s ease;
        }
        .copy-btn .material-icons, .close-btn .material-icons {
          font-size: 20px;
        }
        .copy-btn:hover, .close-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
        .copied-badge { font-size: 0.85rem; color: #ffffff; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.2); margin-right: 8px; }
        
        .assistant-body {
          flex: 1; padding: 24px; overflow-y: auto;
          display: flex; flex-direction: column; gap: 16px;
        }
        .assistant-message { display: flex; flex-direction: column; }
        .assistant-message--user { align-self: flex-end; max-width: 80%; }
        .assistant-message--user .assistant-message__text {
          background: linear-gradient(135deg, #1a73e8, #8ab4f8); color: white;
          padding: 12px 16px; border-radius: 20px 20px 4px 20px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.15); line-height: 1.5; font-size: 0.95rem;
        }
        .assistant-message--assistant { align-self: flex-start; max-width: 85%; }
        .assistant-message--assistant .assistant-message__text {
          background: #ffffff; color: #333;
          padding: 14px 18px; border-radius: 20px 20px 20px 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1); line-height: 1.6; font-size: 0.95rem;
        }
        .assistant-message--system { align-self: center; text-align: center; }
        .assistant-message--system .assistant-message__text {
          background: transparent; color: #9e9e9e; font-size: 0.85rem; padding: 4px; font-weight: 500;
        }
        
        .assistant-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .assistant-action {
          background: white; color: #1a73e8;
          border: 1px solid rgba(26, 115, 232, 0.3); border-radius: 24px;
          padding: 8px 16px; font-size: 0.875rem; font-weight: 500; letter-spacing: 0.5px;
          cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.2s ease;
        }
        .assistant-action:hover:not(:disabled) { background: rgba(26, 115, 232, 0.04); border-color: #1a73e8; }
        .assistant-action:disabled { opacity: 0.6; cursor: default; background: #f5f5f5; border-color: #ddd; color: #999; }

        .assistant-suggestions {
          display: flex; flex-wrap: wrap; gap: 8px;
          padding: 12px 16px 4px;
        }
        .assistant-suggestion-chip {
          background: #f0f4ff; color: #1a73e8;
          border: 1px solid rgba(26, 115, 232, 0.25); border-radius: 20px;
          padding: 7px 14px; font-size: 0.82rem; font-weight: 500;
          cursor: pointer; transition: background 0.15s, border-color 0.15s;
          text-align: left;
        }
        .assistant-suggestion-chip:hover { background: #dce8ff; border-color: #1a73e8; }
        
        .assistant-input {
          display: flex; gap: 16px; align-items: center;
          padding: 16px 24px; background: white;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.05); z-index: 10;
        }
        .assistant-input input {
          flex: 1; padding: 14px 20px; font-size: 1rem;
          background: #f5f5f5; border: 1px solid transparent; border-radius: 28px;
          transition: all 0.2s ease;
        }
        .assistant-input input:focus {
          outline: none; background: white; border-color: #1a73e8; box-shadow: 0 2px 6px rgba(26,115,232,0.1);
        }
        .assistant-input button {
          background: linear-gradient(135deg, #1a73e8, #8ab4f8); color: white; border: none; border-radius: 28px;
          padding: 12px 24px; font-size: 0.95rem; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;
          cursor: pointer; box-shadow: 0 2px 6px rgba(26,115,232,0.3); transition: all 0.2s ease;
        }
        .assistant-input button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 8px rgba(26,115,232,0.4); }
        .assistant-input button:disabled { background: #e0e0e0; color: #9e9e9e; box-shadow: none; cursor: default; }
      `}</style>
    </div>
  );
}
