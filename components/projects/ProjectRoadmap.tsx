'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Contact, ProjectItem, ProjectTask } from '@myorg/types';
import { TaskModal } from '@myorg/ui';
import { createProjectsApiClient } from '@myorg/api-client';
import { buildRoadmap, getRoadmapLanes, type RoadmapEntry } from '@/lib/projects/roadmap';
import { getPlanNodes, linkKey, parsePlanLinks, validatePlanLinks, type PlanLink } from '@/lib/projects/planning';
import { updateProjectTask } from '@/lib/projects/taskUpdates';
import styles from './ProjectPlan.module.css';

type Props = {
  project: ProjectItem;
  links: PlanLink[];
  people: Contact[];
  canManage?: boolean;
  actionsContainer?: HTMLElement | null;
  onSaveLink?: (action: 'add' | 'remove', link: PlanLink) => Promise<PlanLink[]>;
  onApplyChange?: (updated: Partial<ProjectItem>) => void;
};
const barColors = ['#1565c0', '#6a1b9a', '#00796b', '#ad4800', '#b3265e', '#37474f'];
const editorWidth = 560;

export default function ProjectRoadmap({ project, links: initialLinks, people, canManage = false, actionsContainer, onSaveLink, onApplyChange }: Props) {
  const [view, setView] = useState<'project' | 'person'>('project');
  const [subprojects, setSubprojects] = useState(project.subprojects);
  const subprojectsRef = useRef(subprojects);
  const [links, setLinks] = useState(initialLinks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [editing, setEditing] = useState<{ taskId: string; lane: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const busyRef = useRef(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { setLinks(initialLinks); }, [initialLinks]);
  useEffect(() => {
    setSubprojects(project.subprojects);
    subprojectsRef.current = project.subprojects;
  }, [project.subprojects]);
  const planningProject = useMemo(() => ({ ...project, subprojects }), [project, subprojects]);
  const nodes = useMemo(() => getPlanNodes(planningProject), [planningProject]);
  const roadmap = useMemo(() => buildRoadmap(planningProject, links), [planningProject, links]);
  const tasks = subprojects.flatMap(section => section.tasks);
  const selectedTask = tasks.find(task => task.id === selectedId);
  const editingTask = tasks.find(task => task.id === editing?.taskId);
  useEffect(() => {
    if (!editing) return;
    editorRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    editorRef.current?.scrollIntoView?.({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
  }, [editing]);
  useEffect(() => {
    if (selecting) promptRef.current?.focus();
  }, [selecting]);

  function editTask(task: ProjectTask) {
    if (!canManage || !onApplyChange) return;
    const section = subprojectsRef.current.find(item => item.tasks.some(item => item.id === task.id));
    if (!section) { setError('This task no longer exists. Reload the project before editing.'); return; }
    const updated = updateProjectTask(subprojectsRef.current, section.id, task.id, () => task);
    subprojectsRef.current = updated;
    setSubprojects(updated);
    onApplyChange({ subprojects: updated });
  }

  function cancelSelection() {
    setSelecting(false);
    setError('');
    triggerRef.current?.focus();
  }

  async function addDependency(prerequisite: ProjectTask) {
    if (!selectedTask || busyRef.current) return;
    const link: PlanLink = { dependent: { kind: 'task', id: selectedTask.id }, prerequisite: { kind: 'task', id: prerequisite.id } };
    if (prerequisite.id === selectedTask.id) { setError('Choose a different task.'); return; }
    if (links.some(item => linkKey(item) === linkKey(link))) { setError('Already linked.'); return; }
    const invalid = validatePlanLinks(nodes, [...links, link]);
    if (invalid) { setError(invalid); return; }
    busyRef.current = true;
    setBusy(true);
    setError('');
    setAnnouncement('');
    try {
      const savedLinks = onSaveLink
        ? await onSaveLink('add', link)
        : (await createProjectsApiClient().updateProjectPlan(project.id, 'add', link)).planningLinks;
      const saved = parsePlanLinks(savedLinks);
      if (!saved) throw new Error('The server returned an invalid plan. Reload the project before retrying.');
      setLinks(saved);
      setSelecting(false);
      setAnnouncement(`${selectedTask.text} depends on ${prerequisite.text}. Dependency saved.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save the dependency.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function chooseBar(task: ProjectTask, trigger: HTMLButtonElement) {
    if (busyRef.current || !canManage) return;
    if (selecting) { void addDependency(task); return; }
    triggerRef.current = trigger;
    setSelectedId(task.id);
    setError('');
  }

  const actions = canManage && selectedTask && !selecting ? (
    <div className={styles.graphActions} role="group" aria-label="Selected roadmap task">
      <span className={styles.actionLabel}>{selectedTask.text}</span>
      {onApplyChange && <button type="button" disabled={busy} onClick={() => {
        const bar = triggerRef.current;
        setEditing({ taskId: selectedTask.id, lane: bar?.closest('[data-group]')?.getAttribute('data-group') ?? 'project' });
      }}><span className="material-icons" aria-hidden="true">edit</span>Edit</button>}
      <button type="button" disabled={busy || !!roadmap.error} onClick={() => {
        setSelecting(true);
        setError('');
        setAnnouncement('');
      }}><span className="material-icons" aria-hidden="true">add_link</span>Add dependency</button>
    </div>
  ) : null;
  const remaining = useMemo(() => roadmap.entries.filter(entry => !entry.task.done), [roadmap]);
  const groups = useMemo(() => {
    if (view === 'project') return [{ name: null, lanes: getRoadmapLanes(remaining) }];
    const peopleEntries = new Map<string, RoadmapEntry[]>();
    for (const entry of remaining) {
      const names = entry.task.people.length ? [...new Set(entry.task.people.map(person => person.name))] : ['Unassigned'];
      for (const name of names) peopleEntries.set(name, [...(peopleEntries.get(name) ?? []), entry]);
    }
    return [...peopleEntries].map(([name, entries]) => ({ name, lanes: getRoadmapLanes(entries) }));
  }, [view, remaining]);
  const today = new Date();
  const origin = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const date = (day: number) => new Date(origin + day * 86400000).toISOString().slice(0, 10);
  const completion = Math.max(0, ...remaining.map(entry => entry.end));
  const days = Math.max(1, completion);
  const durations = remaining.map(entry => entry.end - entry.start).filter(duration => duration > 0);
  const width = Math.max(560, days * 48 / Math.min(1, ...durations));
  const ticks = Math.max(1, Math.min(8, Math.floor(days)));
  const unsized = remaining.filter(entry => entry.estimated).length;
  const sizedEffort = remaining.filter(entry => !entry.estimated).reduce((total, entry) => total + entry.end - entry.start, 0);
  const avatars = new Map([
    ...people.map(person => [person.name, person.avatarUrl] as const),
    ...(project.members ?? []).map(member => [member.name, member.avatarUrl] as const).filter(([, url]) => !!url),
  ]);

  return <section className={`${styles.plan} ${styles.roadmap}`} aria-label="Roadmap" onKeyDown={event => {
    if (event.key !== 'Escape' || editing || busyRef.current) return;
    if (selecting) { event.stopPropagation(); cancelSelection(); }
    else if (selectedId) { event.stopPropagation(); setSelectedId(null); triggerRef.current?.focus(); }
  }}>
    {actionsContainer ? createPortal(actions, actionsContainer) : actions}
    <dl className={styles.roadmapSummary}>
      <div><dt>Expected completion</dt><dd>{roadmap.error ? 'Unavailable' : date(completion)}</dd></div>
      <div><dt>Sized effort remaining</dt><dd>{roadmap.error ? 'Unavailable' : `${Number(sizedEffort.toFixed(2))} days`}</dd></div>
      <div><dt>Unsized tasks</dt><dd>{roadmap.error ? 'Unavailable' : unsized}</dd></div>
    </dl>
    <div className={styles.roadmapViews} role="group" aria-label="Roadmap view">
      <button type="button" aria-pressed={view === 'project'} onClick={() => { setView('project'); setEditing(null); }}><span className="material-icons" aria-hidden="true">view_timeline</span>Across project</button>
      <button type="button" aria-pressed={view === 'person'} onClick={() => { setView('person'); setEditing(null); }}><span className="material-icons" aria-hidden="true">people</span>By person</button>
    </div>
    {selecting && selectedTask && <div className={styles.selection}>
      <p ref={promptRef} tabIndex={-1}>Select what {selectedTask.text} depends on</p>
      <button type="button" disabled={busy} onClick={cancelSelection}>Cancel</button>
    </div>}
    {error && !roadmap.error && <p role="alert" className={styles.error}>{error}</p>}
    <p role="status" className={styles.status}>{busy ? 'Saving dependency…' : announcement}</p>
    {roadmap.error ? <p role="alert" className={styles.error}>{roadmap.error}</p> : !remaining.length
      ? <p className={styles.empty}>No remaining tasks.</p>
      : <>
        <p className={styles.roadmapCaption}>Forecast from {date(0)} · Effort in calendar days · Unsized tasks estimated at 1 day{view === 'person' && ' · Grouped by assignee; project forecast dates unchanged'}</p>
        <div className={styles.roadmapScroll}>
          <div style={{ minWidth: width + 100 }}>
            <div className={styles.roadmapRow}>
              <div className={styles.dateAxis} style={{ width }}>
                {Array.from({ length: ticks + 1 }, (_, index) => {
                  const offset = index * days / ticks;
                  return <span key={index} style={{ left: `${index / ticks * 100}%` }}>{date(offset)}</span>;
                })}
              </div>
            </div>
            {groups.map(group => <React.Fragment key={group.name ?? 'project'}>
              {group.name && <h3 className={styles.personHeading}>{group.name}</h3>}
              {group.lanes.map((lane, index) => {
                let previousStart = -Infinity;
                let level = 0;
                const items = lane.map(entry => {
                  if (entry.start === previousStart) level++;
                  else level = 0;
                  previousStart = entry.start;
                  return { entry, level };
                });
                const height = 66 + Math.max(...items.map(item => item.level)) * 56;
                const laneKey = `${group.name ?? 'project'}:${lane[0]!.task.id}`;
                const groupKey = group.name ?? 'project';
                const editingEntry = editingTask && editing?.lane === groupKey
                  && group.lanes.findIndex(other => other.some(entry => entry.task.id === editingTask.id)) === index
                  ? lane.find(entry => entry.task.id === editingTask.id) : undefined;
                return <React.Fragment key={laneKey}><div className={styles.roadmapRow} role="group" data-group={groupKey} aria-label={`${group.name ? `${group.name}: ` : ''}Dependency chain ${index + 1}`}>
                  <div className={styles.roadmapTrack} style={{ width, height, backgroundSize: `${100 / ticks}% 100%` }}>
                    {items.map(({ entry: { task, section, start, end, estimated }, level: itemLevel }, taskIndex) => {
                      const effort = estimated ? '~1d' : `${task.effort ?? 0}d`;
                      const color = barColors[taskIndex % barColors.length];
                      const label = `${task.text}: ${date(start)} to ${date(end)}, ${end - start} days${estimated ? ', estimated' : ''}`;
                      const barClass = `${styles.roadmapBar} ${estimated ? styles.estimatedBar : ''} ${selectedId === task.id && canManage ? styles.selectedBar : ''} ${selecting ? styles.pickableBar : ''}`;
                      return <div key={task.id} className={styles.roadmapItem}
                        style={{ left: `${start / days * 100}%`, width: `${(end - start) / days * 100}%`, top: itemLevel * 56 }}>
                        {canManage
                          ? <button type="button" className={barClass} disabled={busy}
                            style={{ backgroundColor: color, borderColor: color }}
                            aria-label={selecting ? `Select prerequisite: ${label}` : label}
                            aria-pressed={selectedId === task.id}
                            title={selecting ? `${selectedTask?.text} depends on ${task.text}` : `${task.text} · ${date(start)} – ${date(end)}${estimated ? ' · Estimated: 1 day' : ''}${task.dueDate ? ` · Due ${task.dueDate.slice(0, 10)}` : ''}`}
                            onClick={event => chooseBar(task, event.currentTarget)}>
                            <span className={styles.estimateLabel}>{effort}</span>
                          </button>
                          : <div className={barClass}
                            style={{ backgroundColor: color, borderColor: color }}
                            role="img" aria-label={label}
                            title={`${task.text} · ${date(start)} – ${date(end)}${estimated ? ' · Estimated: 1 day' : ''}${task.dueDate ? ` · Due ${task.dueDate.slice(0, 10)}` : ''}`}>
                            <span className={styles.estimateLabel}>{effort}</span>
                          </div>}
                        <span className={styles.roadmapLabel} title={`${section}: ${task.text} · ${effort}`}
                          style={{ maxWidth: end === start || taskIndex === lane.length - 1 ? 180 : '100%' }}>{task.text}</span>
                        <span className={styles.assignees}>{task.people.map(person => {
                          const url = avatars.get(person.name);
                          return <span key={person.name} role="img" aria-label={person.name} title={person.name}
                            className={styles.assignee} style={url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined}>
                            {!url && person.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}
                          </span>;
                        })}</span>
                      </div>;
                    })}
                  </div>
                </div>
                {editingEntry && editingTask && <div ref={editorRef} className={styles.roadmapEditor} role="region" aria-label={`Edit ${editingTask.text}`}
                  style={{ marginLeft: Math.max(0, Math.min(editingEntry.start / days * width, width + 100 - editorWidth)), width: editorWidth }}>
                  <TaskModal task={editingTask} inline allPeople={people} onUpdateTask={editTask}
                    onSave={() => setEditing(null)} onClose={() => setEditing(null)} />
                  <button type="button" className={styles.closeEditor} onClick={() => { setEditing(null); triggerRef.current?.focus(); }}>Done</button>
                </div>}
                </React.Fragment>;
              })}
            </React.Fragment>)}
          </div>
        </div>
      </>}
  </section>;
}
