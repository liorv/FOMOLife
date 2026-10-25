'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectItem, ProjectRisk, ProjectTask } from '@myorg/types';
import { TaskModal } from '@myorg/ui';
import { generateId } from '@myorg/utils';
import { getPlanNodes } from '@/lib/projects/planning';
import { updateProjectTask } from '@/lib/projects/taskUpdates';
import { getProjectMemberContacts } from '@/lib/client/projectMembers';
import styles from './ProjectPlan.module.css';
import riskStyles from './ProjectRisks.module.css';

type Props = {
  project: ProjectItem;
  canManage: boolean;
  onApplyChange?: (updated: Partial<ProjectItem>) => void;
};

export default function ProjectRisks({ project, canManage, onApplyChange }: Props) {
  const [subprojects, setSubprojects] = useState(project.subprojects);
  const latest = useRef(subprojects);
  const [editor, setEditor] = useState<{ taskId: string; risk: ProjectRisk; isNew: boolean } | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const nodes = useMemo(() => getPlanNodes({ subprojects }), [subprojects]);
  const tasks = subprojects.flatMap(section => section.tasks);
  const byId = new Map(tasks.map(task => [task.id, task]));
  const editingTask = editingTaskId ? byId.get(editingTaskId) : undefined;
  const people = useMemo(() => getProjectMemberContacts(project.members ?? []), [project.members]);

  useEffect(() => {
    setSubprojects(project.subprojects);
    latest.current = project.subprojects;
  }, [project.subprojects]);

  useEffect(() => {
    editorRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [editor?.taskId, editor?.risk.id, editingTaskId]);

  function editTask(taskId: string, update: (task: ProjectTask) => ProjectTask) {
    if (!canManage) return false;
    const section = latest.current.find(item => item.tasks.some(task => task.id === taskId));
    if (!section) {
      setError('This task no longer exists. Reopen Risks to refresh the task list.');
      return false;
    }
    const next = updateProjectTask(latest.current, section.id, taskId, update);
    latest.current = next;
    setSubprojects(next);
    onApplyChange?.({ subprojects: next });
    setError('');
    return true;
  }

  function openRisk(taskId: string, risk?: ProjectRisk) {
    setEditingTaskId(null);
    setEditor({
      taskId, isNew: !risk,
      risk: risk ? { ...risk, mitigations: risk.mitigations.map(item => ({ ...item })) }
        : { id: generateId(), name: '', description: '', mitigations: [] },
    });
  }

  return (
    <section className={styles.plan} aria-label={`${project.text} project risks`}>
      <h3 className={styles.sectionHeading}>Risk Management</h3>
      <p className={styles.caption}>Add risks to tasks and record mitigations. Risks without mitigations are unmitigated.</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.sequence}>
        {!nodes.length ? <p className={styles.empty}>Add tasks or sections in Tasks to start managing risks.</p> : (
          <table className={styles.table} aria-label="Risk Management">
            <thead><tr><th scope="col">Task / Section</th><th scope="col">Risks</th>
              {canManage && <th scope="col"><span className={styles.srOnly}>Actions</span></th>}
            </tr></thead>
            <tbody>{nodes.map(node => {
              const task = node.ref.kind === 'task' ? byId.get(node.ref.id) : undefined;
              return <React.Fragment key={node.key}>
                <tr className={task ? styles.taskRow : styles.sectionRow}>
                  <th scope="row">
                    {task && canManage ? <button type="button" className={styles.node}
                      title={task ? `${task.text} (${node.context})` : node.text}
                      onClick={() => { setEditor(null); setEditingTaskId(node.ref.id); }}>
                      <span className={styles.nodeTitle}>{node.text}</span>
                      {node.done && <span className={`material-icons ${styles.completed}`} aria-label="Completed">check</span>}
                    </button> : <span className={styles.node}>{node.text}
                      {node.done && <span className={`material-icons ${styles.completed}`} aria-label="Completed">check</span>}
                    </span>}
                  </th>
                  <td>{task?.risks?.length ? <ul className={riskStyles.risks}>
                    {task.risks.map(risk => <li key={risk.id} className={riskStyles.risk}>
                      <div className={riskStyles.riskHeading}>
                        <strong>{risk.name}</strong>
                        <span className={risk.mitigations.length ? riskStyles.mitigated : riskStyles.unmitigated}>
                          {risk.mitigations.length ? 'Mitigated' : 'Unmitigated'}
                        </span>
                      </div>
                      {risk.description && <p className={riskStyles.description}>{risk.description}</p>}
                      {!!risk.mitigations.length && <ul aria-label={`Mitigations for ${risk.name}`}>
                        {risk.mitigations.map(mitigation => <li key={mitigation.id}>{mitigation.text}</li>)}
                      </ul>}
                      {canManage && <div className={riskStyles.buttons}>
                        <button type="button" onClick={() => openRisk(task.id, risk)} aria-label={`Edit risk ${risk.name}`}>Edit</button>
                        <button type="button" onClick={() => {
                          editTask(task.id, current => ({ ...current, risks: current.risks?.filter(item => item.id !== risk.id) ?? [] }));
                          if (editor?.taskId === task.id && editor.risk.id === risk.id) setEditor(null);
                        }} aria-label={`Remove risk ${risk.name}`}>Remove</button>
                      </div>}
                    </li>)}
                  </ul> : task ? <span className={styles.noLinks}>No risks</span> : null}</td>
                  {canManage && <td className={styles.actions}>{task && <button type="button"
                    aria-label={`Add risk for ${task.text} (${node.context})`} title={`Add risk for ${task.text}`}
                    onClick={() => openRisk(task.id)}><span className="material-icons" aria-hidden="true">add</span></button>}</td>}
                </tr>
                {canManage && task && editor?.taskId === task.id && <tr><td colSpan={3}>
                  <div ref={editorRef} className={riskStyles.editor} role="region" aria-label={`${editor.isNew ? 'Add' : 'Edit'} risk for ${task.text}`}>
                    <form onSubmit={event => {
                      event.preventDefault();
                      const risk = {
                        ...editor.risk, name: editor.risk.name.trim(), description: editor.risk.description.trim(),
                        mitigations: editor.risk.mitigations.map(item => ({ ...item, text: item.text.trim() })),
                      };
                      if (!risk.name || risk.mitigations.some(item => !item.text)) {
                        setError('Enter a risk name and non-empty text for each mitigation.');
                        return;
                      }
                      const saved = editTask(task.id, current => ({
                        ...current, risks: editor.isNew ? [...(current.risks ?? []), risk]
                          : (current.risks ?? []).map(item => item.id === risk.id ? risk : item),
                      }));
                      if (saved) setEditor(null);
                    }}>
                      <label>Risk name<input autoComplete="off" required pattern=".*\S.*" value={editor.risk.name}
                        onChange={event => setEditor({ ...editor, risk: { ...editor.risk, name: event.target.value } })} /></label>
                      <label>Description<textarea value={editor.risk.description}
                        onChange={event => setEditor({ ...editor, risk: { ...editor.risk, description: event.target.value } })} /></label>
                      <fieldset><legend>Mitigations</legend>
                        {!editor.risk.mitigations.length && <p>No mitigations yet. This risk is unmitigated.</p>}
                        {editor.risk.mitigations.map((mitigation, index) => <div className={riskStyles.mitigation} key={mitigation.id}>
                          <label>Mitigation {index + 1}<input required pattern=".*\S.*" value={mitigation.text}
                            onChange={event => setEditor({ ...editor, risk: { ...editor.risk,
                              mitigations: editor.risk.mitigations.map(item => item.id === mitigation.id ? { ...item, text: event.target.value } : item),
                            } })} /></label>
                          <button type="button" aria-label={`Remove mitigation ${index + 1}`} onClick={() => setEditor({ ...editor,
                            risk: { ...editor.risk, mitigations: editor.risk.mitigations.filter(item => item.id !== mitigation.id) },
                          })}>Remove</button>
                        </div>)}
                        <button type="button" onClick={() => setEditor({ ...editor, risk: { ...editor.risk,
                          mitigations: [...editor.risk.mitigations, { id: generateId(), text: '' }],
                        } })}>Add mitigation</button>
                      </fieldset>
                      <div className={riskStyles.buttons}>
                        <button type="submit" disabled={!editor.risk.name.trim() || editor.risk.mitigations.some(item => !item.text.trim())}>Save risk</button>
                        <button type="button" onClick={() => setEditor(null)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </td></tr>}
                {canManage && task && editingTask?.id === task.id && <tr><td colSpan={3}>
                  <div ref={editorRef} className={styles.taskEditor} role="region" aria-label={`Edit ${task.text}`}>
                    <TaskModal task={editingTask} inline allPeople={people}
                      onUpdateTask={updated => editTask(task.id, current => ({ ...current, ...updated }))}
                      onSave={() => setEditingTaskId(null)} onClose={() => setEditingTaskId(null)} />
                    <button type="button" className={styles.closeEditor} onClick={() => setEditingTaskId(null)}>Done</button>
                  </div>
                </td></tr>}
              </React.Fragment>;
            })}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}
