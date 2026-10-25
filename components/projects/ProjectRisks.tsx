'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProjectItem, ProjectRisk, ProjectTask } from '@myorg/types';
import { ModalOverlay, TaskModal } from '@myorg/ui';
import { generateId } from '@myorg/utils';
import { getPlanNodes } from '@/lib/projects/planning';
import { updateProjectTask } from '@/lib/projects/taskUpdates';
import { getProjectMemberContacts } from '@/lib/client/projectMembers';
import styles from './ProjectPlan.module.css';
import riskStyles from './ProjectRisks.module.css';
import templateStyles from './ProjectTemplates.module.css';
import CompletedTaskIcon from './CompletedTaskIcon';
import ProjectViewHelp from './ProjectViewHelp';

type Props = {
  project: ProjectItem;
  canManage: boolean;
  initialFilter?: RiskFilter;
  onApplyChange?: (updated: Partial<ProjectItem>) => void;
};

type RiskFilter = 'all' | 'mitigated' | 'unmitigated';
const RISK_FILTERS: { value: RiskFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'unmitigated', label: 'Unmitigated' },
];

function matchesRiskFilter(risk: ProjectRisk, filter: RiskFilter) {
  return filter === 'all' || (filter === 'mitigated' ? risk.mitigations.length > 0 : risk.mitigations.length === 0);
}

export default function ProjectRisks({ project, canManage, initialFilter = 'all', onApplyChange }: Props) {
  const [subprojects, setSubprojects] = useState(project.subprojects);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>(initialFilter);
  const latest = useRef(subprojects);
  const [editor, setEditor] = useState<{ taskId: string; risk: ProjectRisk; isNew: boolean } | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [mitigationDraft, setMitigationDraft] = useState<{ taskId: string; riskId: string; text: string; mitigationId?: string } | null>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);
  const riskInputFormRef = useRef<HTMLFormElement>(null);
  const riskInputRef = useRef<HTMLInputElement>(null);
  const focusNewRiskRef = useRef(false);
  const [riskNameDraft, setRiskNameDraft] = useState('');
  const mitigationInputRef = useRef<HTMLInputElement>(null);
  const mitigationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [hoveredRisk, setHoveredRisk] = useState<{ taskId: string; riskId: string; anchor: HTMLElement } | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [selection, setSelection] = useState<{ taskId: string; riskId: string | null } | null>(null);
  const titleId = useId();
  const tooltipId = `${titleId}-description`;
  const nodes = useMemo(() => getPlanNodes({ subprojects: riskFilter === 'all' ? subprojects : subprojects
    .map(section => ({ ...section, tasks: section.tasks.filter(task => task.risks?.some(risk => matchesRiskFilter(risk, riskFilter))) }))
    .filter(section => section.tasks.length > 0) }), [subprojects, riskFilter]);
  const tasks = subprojects.flatMap(section => section.tasks);
  const byId = new Map(tasks.map(task => [task.id, task]));
  const editingTask = editingTaskId ? byId.get(editingTaskId) : undefined;
  const editingRiskId = editor?.risk.id;
  const addingMitigation = !!mitigationDraft;
  const tooltipRisk = hoveredRisk ? byId.get(hoveredRisk.taskId)?.risks?.find(risk => risk.id === hoveredRisk.riskId) : undefined;
  const tooltipRect = tooltipVisible ? hoveredRisk?.anchor.getBoundingClientRect() : undefined;
  const people = useMemo(() => getProjectMemberContacts(project.members ?? []), [project.members]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('project-view-active', { detail: 'risks' }));
    return () => {
      window.dispatchEvent(new CustomEvent('project-view-active', { detail: null }));
    };
  }, []);

  useEffect(() => {
    setSubprojects(project.subprojects);
    latest.current = project.subprojects;
  }, [project.subprojects]);

  useEffect(() => {
    editorRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [editingTaskId]);

  useEffect(() => {
    if (!editingRiskId || !canManage) return;
    dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [editor?.taskId, editingRiskId, canManage]);

  useEffect(() => {
    if (addingMitigation) mitigationInputRef.current?.focus();
    else mitigationTriggerRef.current?.focus();
  }, [mitigationDraft?.taskId, mitigationDraft?.riskId, mitigationDraft?.mitigationId, addingMitigation]);

  useEffect(() => {
    setTooltipVisible(false);
    if (!hoveredRisk) return;
    const timer = setTimeout(() => setTooltipVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [hoveredRisk]);

  useEffect(() => {
    if (!selection || editor) return;
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Node && (selectedRowRef.current?.contains(event.target) || riskInputFormRef.current?.contains(event.target))) return;
      mitigationTriggerRef.current = null;
      setSelection(null);
      setMitigationDraft(null);
      setHoveredRisk(null);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [selection, editor]);

  useEffect(() => {
    setRiskNameDraft('');
  }, [selection?.taskId, selection?.riskId]);

  useEffect(() => {
    if (!selection?.riskId || riskFilter === 'all') return;
    const risk = subprojects.flatMap(section => section.tasks).find(task => task.id === selection.taskId)?.risks?.find(item => item.id === selection.riskId);
    if (risk && matchesRiskFilter(risk, riskFilter)) return;
    mitigationTriggerRef.current = null;
    setSelection(null);
    setMitigationDraft(null);
    setHoveredRisk(null);
  }, [subprojects, riskFilter, selection]);

  useEffect(() => {
    if (!focusNewRiskRef.current) return;
    riskInputRef.current?.focus();
    focusNewRiskRef.current = false;
  }, [subprojects]);

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

  function closeEditor() {
    setEditor(null);
    triggerRef.current?.focus();
  }

  function openRisk(taskId: string, trigger: HTMLButtonElement, risk?: ProjectRisk) {
    triggerRef.current = trigger;
    setHoveredRisk(null);
    setMitigationDraft(null);
    setError('');
    setEditingTaskId(null);
    setEditor({
      taskId, isNew: !risk,
      risk: risk ? { ...risk, mitigations: risk.mitigations.map(item => ({ ...item })) }
        : { id: generateId(), name: '', description: '', mitigations: [] },
    });
  }

  function cancelMitigation() {
    setMitigationDraft(null);
    mitigationTriggerRef.current?.focus();
  }

  function riskInput(task: ProjectTask) {
    return <form ref={riskInputFormRef} className={riskStyles.quickAdd} aria-label={`Add risk for ${task.text}`}
      onClick={event => event.stopPropagation()} onSubmit={event => {
        event.preventDefault();
        const name = riskNameDraft.trim();
        if (!name) { setError('Enter a risk name before saving.'); return; }
        const risk: ProjectRisk = { id: generateId(), name, description: '', mitigations: [] };
        if (editTask(task.id, current => ({ ...current, risks: [...(current.risks ?? []), risk] }))) {
          focusNewRiskRef.current = true;
          setRiskNameDraft('');
        }
      }}>
      <input ref={riskInputRef} aria-label={`New risk for ${task.text}`} placeholder="What is the risk?"
        value={riskNameDraft} onChange={event => setRiskNameDraft(event.target.value)}
        onBlur={() => setRiskNameDraft('')} onKeyDown={event => {
          if (event.key === 'Escape') { setRiskNameDraft(''); event.currentTarget.blur(); }
        }} />
    </form>;
  }

  return (
    <section className={styles.plan} aria-label={`${project.text} project risks`}>
      <div className={riskStyles.header}>
        <h3 className={styles.sectionHeading}>Risk Management</h3>
        <div role="group" aria-label="Filter risks" className={templateStyles.segmented}
          style={{ '--segment-count': RISK_FILTERS.length, '--segment-index': RISK_FILTERS.findIndex(filter => filter.value === riskFilter) } as React.CSSProperties}>
          <span className={templateStyles.segmentThumb} aria-hidden="true" />
          {RISK_FILTERS.map(({ value, label }) => <button key={value} type="button" className={templateStyles.segment}
            aria-pressed={riskFilter === value} onClick={() => {
              if (riskFilter === value) return;
              setRiskFilter(value);
              mitigationTriggerRef.current = null;
              setSelection(null);
              setMitigationDraft(null);
              setHoveredRisk(null);
              setRiskNameDraft('');
              setEditingTaskId(null);
              setError('');
            }}>{label}</button>)}
        </div>
      </div>
      <p className={styles.caption}>{canManage
        ? 'Select a row to edit risks and mitigations. Click outside the row to finish.'
        : 'Risks without mitigations are unmitigated.'}</p>
      {error && !editor && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.sequence}>
        {!nodes.length ? <p className={styles.empty}>{riskFilter === 'all'
          ? 'Add tasks or sections in Tasks to start managing risks.'
          : 'No risks match this filter.'}</p> : (
          <table className={`${styles.table} ${riskStyles.table}`} aria-label="Risk Management">
            <thead><tr><th scope="col">Task / Section</th><th scope="col">Risks</th><th scope="col">Mitigations</th></tr></thead>
            {nodes.map(node => {
              const task = node.ref.kind === 'task' ? byId.get(node.ref.id) : undefined;
              const risks = task?.risks?.length ? task.risks.filter(risk => matchesRiskFilter(risk, riskFilter)) : [null];
              const addingRisk = canManage && task && selection?.taskId === task.id;
              const extraRiskRow = addingRisk && !!task.risks?.length;
              return <tbody key={node.key}>
                {risks.map((risk, index) => {
                  const active = canManage && task && selection?.taskId === task.id && selection.riskId === (risk?.id ?? null);
                  return <tr key={risk?.id ?? node.key} ref={active ? selectedRowRef : undefined}
                  className={`${task ? styles.taskRow : styles.sectionRow} ${canManage && task ? riskStyles.selectableRow : ''} ${selection?.taskId === task?.id && selection?.riskId === (risk?.id ?? null) ? styles.selectedRow : ''}`}
                  tabIndex={canManage && task ? 0 : undefined}
                  aria-label={canManage && task ? `Select row: ${task.text}${risk ? ` / ${risk.name}` : ''}` : undefined}
                  onClick={event => {
                    if (!canManage || !task || (event.target instanceof Element && event.target.closest('button, input, textarea, form'))) return;
                    event.stopPropagation();
                    if (!active) setMitigationDraft(null);
                    setSelection({ taskId: task.id, riskId: risk?.id ?? null });
                  }}
                  onKeyDown={event => {
                    if (event.target !== event.currentTarget || !canManage || !task) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (!active) setMitigationDraft(null);
                      setSelection({ taskId: task.id, riskId: risk?.id ?? null });
                    } else if (event.key === 'Escape') { setSelection(null); setMitigationDraft(null); }
                  }}>
                  {index === 0 && <th scope="rowgroup" rowSpan={risks.length + (extraRiskRow ? 1 : 0)}>
                    {task && canManage ? <button type="button" className={styles.node}
                      title={task ? `${task.text} (${node.context})` : node.text}
                      onClick={() => { setEditor(null); setSelection(null); setMitigationDraft(null); setEditingTaskId(node.ref.id); }}>
                      {node.done && <CompletedTaskIcon />}
                      <span className={styles.nodeTitle}>{node.text}</span>
                    </button> : <span className={styles.node}>
                      {task && node.done && <CompletedTaskIcon />}
                      <span className={styles.nodeTitle}>{node.text}</span>
                    </span>}
                  </th>}
                  <td className={risk ? (risk.mitigations.length ? riskStyles.riskMitigated : riskStyles.riskUnmitigated) : undefined}><div className={riskStyles.riskCell}>
                    {task && risk ? <div className={riskStyles.riskHeading}>
                      <span className={riskStyles.riskName} tabIndex={0}
                        aria-describedby={tooltipVisible && tooltipRisk === risk ? tooltipId : undefined}
                        onMouseEnter={event => setHoveredRisk({ taskId: task.id, riskId: risk.id, anchor: event.currentTarget })}
                        onMouseLeave={() => setHoveredRisk(null)}
                        onFocus={event => setHoveredRisk({ taskId: task.id, riskId: risk.id, anchor: event.currentTarget })}
                        onBlur={() => setHoveredRisk(null)}
                        onKeyDown={event => {
                          if (event.target !== event.currentTarget) return;
                          if (event.key === 'Escape') setHoveredRisk(null);
                          if (canManage && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            if (!active) setMitigationDraft(null);
                            setSelection({ taskId: task.id, riskId: risk.id });
                          }
                        }}>
                        {active ? <span className={riskStyles.tag}>
                          <button type="button" aria-label={`Edit risk ${risk.name}`}
                            onClick={event => openRisk(task.id, event.currentTarget, risk)}>{risk.name}</button>
                          <button type="button" aria-label={`Remove risk ${risk.name}`}
                            onClick={() => editTask(task.id, current => ({
                              ...current, risks: current.risks?.filter(item => item.id !== risk.id) ?? [],
                            }))}>&times;</button>
                        </span> : risk.name}
                      </span>
                      <span className={risk.mitigations.length ? riskStyles.mitigated : riskStyles.unmitigated}>
                        {risk.mitigations.length ? 'Mitigated' : 'Unmitigated'}
                      </span>
                    </div> : task && !addingRisk ? <span className={styles.noLinks}>No Risks</span> : null}
                  </div>
                    {addingRisk && !risk && riskInput(task)}
                  </td>
                  <td>{task && risk && <>
                    {(!!risk.mitigations.length || (canManage && mitigationDraft?.taskId === task.id && mitigationDraft.riskId === risk.id)) && <ul className={riskStyles.mitigations} aria-label={`Mitigations for ${risk.name}`}>
                      {risk.mitigations.map(mitigation => <li key={mitigation.id}>
                        <span className={`${riskStyles.mitigationBullet} ${active ? riskStyles.tag : ''}`}>
                          {active ? <button type="button" aria-label={`Edit mitigation: ${mitigation.text} (${risk.name})`}
                            onClick={event => {
                              mitigationTriggerRef.current = event.currentTarget;
                              setError('');
                              setMitigationDraft({ taskId: task.id, riskId: risk.id, text: mitigation.text, mitigationId: mitigation.id });
                            }}>{mitigation.text}</button> : <span>{mitigation.text}</span>}
                          {active && <button type="button" className={riskStyles.removeMitigation}
                            aria-label={`Remove mitigation: ${mitigation.text} (${risk.name})`}
                            title={`Remove mitigation: ${mitigation.text}`}
                            onClick={() => editTask(task.id, current => ({
                              ...current, risks: current.risks?.map(item => item.id === risk.id ? {
                                ...item, mitigations: item.mitigations.filter(entry => entry.id !== mitigation.id),
                              } : item) ?? [],
                            }))}>&times;</button>}
                        </span>
                      </li>)}
                      {canManage && mitigationDraft?.taskId === task.id && mitigationDraft.riskId === risk.id && <li>
                        <form className={riskStyles.inlineEditor} aria-label={`${mitigationDraft.mitigationId ? 'Edit' : 'Add'} mitigation for ${risk.name}`} onSubmit={event => {
                          event.preventDefault();
                          const text = mitigationDraft.text.trim();
                          if (!text) { setError('Enter mitigation text before saving.'); return; }
                          if (!latest.current.flatMap(section => section.tasks).find(item => item.id === task.id)?.risks?.some(item => item.id === risk.id)) {
                            setError('This risk no longer exists. Cancel and refresh the task list.');
                            return;
                          }
                          const mitigation = { id: generateId(), text };
                          if (editTask(task.id, current => ({ ...current, risks: current.risks?.map(item => item.id === risk.id
                            ? { ...item, mitigations: mitigationDraft.mitigationId
                              ? item.mitigations.map(entry => entry.id === mitigationDraft.mitigationId ? { ...entry, text } : entry)
                              : [...item.mitigations, mitigation] } : item) ?? [] }))) cancelMitigation();
                        }}>
                          <input ref={mitigationInputRef} aria-label={`${mitigationDraft.mitigationId ? 'Edit' : 'New'} mitigation for ${risk.name}`} required pattern=".*\S.*"
                            value={mitigationDraft.text} onChange={event => setMitigationDraft({ ...mitigationDraft, text: event.target.value })}
                            onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); cancelMitigation(); } }} />
                          <button type="submit" disabled={!mitigationDraft.text.trim()}>Save mitigation</button>
                          <button type="button" onClick={cancelMitigation}>Cancel</button>
                        </form>
                      </li>}
                    </ul>}
                    {active && !mitigationDraft && <form key={`${task.id}-${risk.id}`} className={riskStyles.quickAdd}
                      aria-label={`Add mitigation for ${risk.name}`} onSubmit={event => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        const text = String(new FormData(form).get('mitigation') ?? '').trim();
                        if (!text) { setError('Enter mitigation text before saving.'); return; }
                        const currentRisk = latest.current.flatMap(section => section.tasks).find(item => item.id === task.id)?.risks?.find(item => item.id === risk.id);
                        if (!currentRisk) { setError('This risk no longer exists. Refresh the task list.'); return; }
                        const mitigation = { id: generateId(), text };
                        if (editTask(task.id, current => ({ ...current, risks: current.risks?.map(item => item.id === risk.id
                          ? { ...item, mitigations: [...item.mitigations, mitigation] } : item) ?? [] }))) form.reset();
                      }}>
                      <input name="mitigation" aria-label={`New mitigation for ${risk.name}`} placeholder="How will we mitigate the risk?"
                        onBlur={event => { event.currentTarget.value = ''; }}
                        onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.value = ''; event.currentTarget.blur(); } }} />
                    </form>}
                  </>}</td>
                </tr>;
                })}
                {extraRiskRow && <tr className={riskStyles.addRiskRow} aria-label={`New risk row for ${task.text}`}>
                  <td>{riskInput(task)}</td><td />
                </tr>}
                {canManage && task && editingTask?.id === task.id && <tr><td colSpan={3}>
                  <div ref={editorRef} className={styles.taskEditor} role="region" aria-label={`Edit ${task.text}`}>
                    <TaskModal task={editingTask} inline allPeople={people}
                      onUpdateTask={updated => editTask(task.id, current => ({ ...current, ...updated }))}
                      onSave={() => setEditingTaskId(null)} onClose={() => setEditingTaskId(null)} />
                    <button type="button" className={styles.closeEditor} onClick={() => setEditingTaskId(null)}>Done</button>
                  </div>
                </td></tr>}
              </tbody>;
            })}
          </table>
        )}
      </div>
      {tooltipVisible && tooltipRisk?.description && tooltipRect && createPortal(
        <div role="tooltip" id={tooltipId} className={riskStyles.tooltip} style={{
          left: Math.max(8, Math.min(tooltipRect.left, window.innerWidth - 288)),
          top: Math.min(tooltipRect.bottom + 6, window.innerHeight - 100),
        }}>{tooltipRisk.description}</div>, document.body,
      )}
      <ModalOverlay open={!!editor && canManage} onClose={closeEditor}
        ariaLabelledby={titleId} contentClassName={`${styles.plan} ${riskStyles.editor}`}>
        {editor && <div ref={dialogRef} onKeyDown={event => {
          if (event.key === 'Escape') { event.stopPropagation(); closeEditor(); }
          if (event.key !== 'Tab') return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>('input, textarea, button:not(:disabled)');
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
          <h3 id={titleId}>{editor.isNew ? 'Add' : 'Edit'} risk for {byId.get(editor.taskId)?.text ?? 'Deleted task'}</h3>
          {error && <p role="alert" className={styles.error}>{error}</p>}
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
            if (!editor.isNew && !latest.current.flatMap(section => section.tasks)
              .find(task => task.id === editor.taskId)?.risks?.some(item => item.id === risk.id)) {
              setError('This risk no longer exists. Close the editor and refresh the task list.');
              return;
            }
            const saved = editTask(editor.taskId, current => ({
              ...current, risks: editor.isNew ? [...(current.risks ?? []), risk]
                : (current.risks ?? []).map(item => item.id === risk.id ? risk : item),
            }));
            if (saved) closeEditor();
          }}>
            <label>Risk name<input autoComplete="off" required pattern=".*\S.*" value={editor.risk.name}
              onChange={event => setEditor({ ...editor, risk: { ...editor.risk, name: event.target.value } })} /></label>
            <label>Description<textarea value={editor.risk.description}
              onChange={event => setEditor({ ...editor, risk: { ...editor.risk, description: event.target.value } })} /></label>
            {!editor.isNew && <fieldset><legend>Mitigations</legend>
              {!editor.risk.mitigations.length && <p>No mitigations yet. This risk is unmitigated.</p>}
              {editor.risk.mitigations.map((mitigation, index) => <div className={riskStyles.mitigation} key={mitigation.id}>
                <label>Mitigation {index + 1}<input required pattern=".*\S.*" value={mitigation.text} data-mitigation-id={mitigation.id}
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
            </fieldset>}
            <div className={riskStyles.buttons}>
              <button type="submit" disabled={!editor.risk.name.trim() || editor.risk.mitigations.some(item => !item.text.trim())}>Save risk</button>
              <button type="button" onClick={closeEditor}>Cancel</button>
            </div>
          </form>
        </div>}
      </ModalOverlay>
      <ProjectViewHelp view="risks" />
    </section>
  );
}
