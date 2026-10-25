'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Contact, ProjectDeadline, ProjectItem, ProjectMilestone, ProjectTask } from '@myorg/types';
import { CheckeredFlag, TaskModal } from '@myorg/ui';
import { generateId } from '@myorg/utils';
import { buildRoadmap, getRoadmapLanes, type RoadmapEntry } from '@/lib/projects/roadmap';
import { getPlanNodes, linkKey, validatePlanLinks, type PlanLink } from '@/lib/projects/planning';
import { updateProjectTask } from '@/lib/projects/taskUpdates';
import { getProjectMemberContacts } from '@/lib/client/projectMembers';
import styles from './ProjectPlan.module.css';
import { usePlanLinks } from './usePlanLinks';
import PlanSaveStatus from './PlanSaveStatus';
import RoadmapEventTables from './RoadmapEventTables';
import { isRoadmapDate } from '@/lib/projects/roadmapEvents';

type Props = {
  project: ProjectItem;
  links: PlanLink[];
  people: Contact[];
  canManage?: boolean;
  actionsContainer?: HTMLElement | null;
  onSaveLink?: (action: 'add' | 'remove', link: PlanLink) => Promise<PlanLink[]>;
  onLinksSaved?: (links: PlanLink[]) => void;
  onApplyChange?: (updated: Partial<ProjectItem>) => void;
  onShowUnmitigatedRisks?: () => void;
};
const barColors = ['#1565c0', '#6a1b9a', '#00796b', '#ad4800', '#b3265e', '#37474f'];

/** White text on dark backgrounds, near-black on light ones (WCAG relative luminance). */
export function readableTextColor(hex: string): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(char => char + char).join('') : value.slice(0, 6);
  const channel = (offset: number) => {
    const c = parseInt(full.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  // Contrast against white beats contrast against #1f1f1f below roughly this luminance.
  return Number.isNaN(luminance) || luminance < 0.2 ? '#ffffff' : '#1f1f1f';
}

export default function ProjectRoadmap({ project, links: initialLinks, people, canManage = false, actionsContainer, onSaveLink, onLinksSaved, onApplyChange, onShowUnmitigatedRisks }: Props) {
  const [view, setView] = useState<'project' | 'person'>('project');
  const [subprojects, setSubprojects] = useState(project.subprojects);
  const subprojectsRef = useRef(subprojects);
  const { links, saveState, save: saveLink, dismissError: dismissSaveError } = usePlanLinks({ projectId: project.id, initialLinks, onSaveLink, onLinksSaved });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [milestones, setMilestones] = useState(project.milestones ?? []);
  const [deadlines, setDeadlines] = useState(project.deadlines ?? []);
  const [milestoneSelection, setMilestoneSelection] = useState<{ id: string | null } | null>(null);
  const [addingDeadline, setAddingDeadline] = useState(false);
  const canEditEvents = canManage && !!onApplyChange;
  const pickingTask = selecting || !!milestoneSelection;
  const [editing, setEditing] = useState<{ taskId: string; lane: string } | null>(null);
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const startMilestone = useCallback((trigger?: HTMLButtonElement) => {
    triggerRef.current = trigger ?? document.querySelector<HTMLButtonElement>('button[aria-label="Roadmap actions"]');
    setSelecting(false);
    setEditing(null);
    setAddingDeadline(false);
    setMilestoneSelection({ id: null });
    setError('');
  }, []);
  const startDeadline = useCallback(() => {
    setSelecting(false);
    setMilestoneSelection(null);
    setAddingDeadline(true);
    setError('');
  }, []);
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!editing || !scroller) return;
    const measure = () => setViewportWidth(scroller.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [editing]);
  useEffect(() => {
    setSubprojects(project.subprojects);
    subprojectsRef.current = project.subprojects;
  }, [project.subprojects]);
  useEffect(() => { setMilestones(project.milestones ?? []); }, [project.milestones]);
  useEffect(() => { setDeadlines(project.deadlines ?? []); }, [project.deadlines]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('project-roadmap-active', { detail: canEditEvents }));
    if (!canEditEvents) return;
    const addMilestone = () => startMilestone();
    const addDeadline = () => startDeadline();
    window.addEventListener('roadmap-add-milestone', addMilestone);
    window.addEventListener('roadmap-add-deadline', addDeadline);
    return () => {
      window.removeEventListener('roadmap-add-milestone', addMilestone);
      window.removeEventListener('roadmap-add-deadline', addDeadline);
      window.dispatchEvent(new CustomEvent('project-roadmap-active', { detail: false }));
    };
  }, [canEditEvents, startMilestone, startDeadline]);
  const planningProject = useMemo(() => ({ ...project, subprojects }), [project, subprojects]);
  const nodes = useMemo(() => getPlanNodes(planningProject), [planningProject]);
  const roadmap = useMemo(() => buildRoadmap(planningProject, links), [planningProject, links]);
  const tasks = subprojects.flatMap(section => section.tasks);
  const selectedTask = tasks.find(task => task.id === selectedId);
  const editingTask = tasks.find(task => task.id === editing?.taskId);
  const assignablePeople = useMemo(() => getProjectMemberContacts(project.members ?? []), [project.members]);
  useEffect(() => {
    if (!editing) return;
    editorRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    editorRef.current?.scrollIntoView?.({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
  }, [editing]);
  useEffect(() => {
    if (pickingTask) promptRef.current?.focus();
  }, [pickingTask]);

  function saveMilestones(items: ProjectMilestone[]) {
    if (!canEditEvents) return;
    setMilestones(items);
    onApplyChange?.({ milestones: items });
  }
  function saveDeadlines(items: ProjectDeadline[]) {
    if (!canEditEvents) return;
    setDeadlines(items);
    onApplyChange?.({ deadlines: items });
  }
  function chooseMilestoneTask(task: ProjectTask) {
    if (!milestoneSelection || !canEditEvents) return;
    const milestone = milestones.find(item => item.id === milestoneSelection.id);
    if (milestoneSelection.id && !milestone) { setError('This milestone no longer exists. Cancel and try again.'); return; }
    if (milestone?.taskIds.includes(task.id)) { setError('This task is already linked to the milestone. Choose a different task.'); return; }
    saveMilestones(milestone
      ? milestones.map(item => item.id === milestone.id ? { ...item, taskIds: [...item.taskIds, task.id] } : item)
      : [...milestones, { id: generateId(), label: task.text, taskIds: [task.id] }]);
    setMilestoneSelection(null);
    setError('');
    triggerRef.current?.focus();
  }

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
    setMilestoneSelection(null);
    setError('');
    triggerRef.current?.focus();
  }

  function addDependency(prerequisite: ProjectTask) {
    if (!selectedTask) return;
    const link: PlanLink = { dependent: { kind: 'task', id: selectedTask.id }, prerequisite: { kind: 'task', id: prerequisite.id } };
    if (prerequisite.id === selectedTask.id) { setError('Choose a different task.'); return; }
    if (links.some(item => linkKey(item) === linkKey(link))) { setError('Already linked.'); return; }
    const invalid = validatePlanLinks(nodes, [...links, link]);
    if (invalid) { setError(invalid); return; }
    setError('');
    setSelecting(false);
    void saveLink('add', link, `${selectedTask.text} depends on ${prerequisite.text}.`);
  }
  function chooseBar(task: ProjectTask, trigger: HTMLButtonElement) {
    if (!canManage) return;
    if (milestoneSelection) { chooseMilestoneTask(task); return; }
    if (selecting) { addDependency(task); return; }
    triggerRef.current = trigger;
    setSelectedId(task.id);
    setError('');
  }

  const actions = canManage && selectedTask && !pickingTask ? (
    <div className={styles.graphActions} role="group" aria-label="Selected roadmap task">
      <span className={styles.actionLabel}>{selectedTask.text}</span>
      {onApplyChange && <button type="button" onClick={() => {
        const bar = triggerRef.current;
        setEditing({ taskId: selectedTask.id, lane: bar?.closest('[data-group]')?.getAttribute('data-group') ?? 'project' });
      }}><span className="material-icons" aria-hidden="true">edit</span>Edit</button>}
      <button type="button" disabled={!!roadmap.error} onClick={() => {
        setSelecting(true);
        setError('');
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
  const milestoneMarkers = roadmap.error ? [] : milestones.flatMap(milestone => {
    const entries = milestone.taskIds.map(id => roadmap.entries.find(entry => entry.task.id === id));
    if (!entries.length || entries.some(entry => !entry)) return [];
    return [{ id: milestone.id, label: milestone.label, day: Math.max(...entries.map(entry => entry!.end)), kind: 'milestone' as const }];
  });
  const markers = [...milestoneMarkers, ...deadlines.filter(deadline => isRoadmapDate(deadline.date)).map(deadline => ({
    id: deadline.id, label: deadline.label, day: (Date.parse(deadline.date) - origin) / 86400000, kind: 'deadline' as const,
  }))];
  const firstDay = Math.min(0, ...markers.map(marker => marker.day));
  const days = Math.max(1, completion, ...markers.map(marker => marker.day)) - firstDay;
  const position = (day: number) => `${(day - firstDay) / days * 100}%`;
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
    if (event.key !== 'Escape' || editing) return;
    if (pickingTask) { event.stopPropagation(); cancelSelection(); }
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
      <button type="button" onClick={cancelSelection}>Cancel</button>
    </div>}
    {milestoneSelection && <div className={styles.selection}>
      <p ref={promptRef} tabIndex={-1}>{milestoneSelection.id
        ? `Select another task for ${milestones.find(item => item.id === milestoneSelection.id)?.label ?? 'milestone'}`
        : 'Select a task for the new milestone'}</p>
      <button type="button" onClick={cancelSelection}>Cancel</button>
      {!remaining.length && <p>Add an incomplete task in Tasks before selecting a milestone dependency.</p>}
    </div>}
    {error && !roadmap.error && <p role="alert" className={styles.error}>{error}</p>}
    <PlanSaveStatus state={saveState} onDismiss={dismissSaveError} />
    {roadmap.error && <p role="alert" className={styles.error}>{roadmap.error}</p>}
    {!roadmap.error && !remaining.length && !markers.length
      ? <p className={styles.empty}>No remaining tasks.</p>
      : (!roadmap.error || markers.length > 0) && <>
        <p className={styles.roadmapCaption}>Forecast from {date(0)} · Effort in calendar days · Unsized tasks estimated at 1 day{view === 'person' && ' · Grouped by assignee; project forecast dates unchanged'}</p>
        <div className={styles.roadmapScroll} ref={scrollRef} data-tab-swipe-ignore="true">
          <div className={styles.roadmapCanvas} style={{ minWidth: width + (markers.length ? 200 : 100), paddingLeft: markers.length ? 96 : 0 }}>
            <div className={styles.roadmapRow}>
              <div className={styles.dateAxis} style={{ width }}>
                {Array.from({ length: ticks + 1 }, (_, index) => {
                  const offset = firstDay + index * days / ticks;
                  return <span key={index} style={{ left: `${index / ticks * 100}%` }}>{date(offset)}</span>;
                })}
              </div>
            </div>
            <div className={styles.deadlineGuides} style={{ left: markers.length ? 96 : 0, width }} aria-hidden="true">
              {markers.filter(marker => marker.kind === 'deadline').map(marker => <div key={marker.id}
                className={styles.deadlineLine} style={{ left: position(marker.day) }} />)}
            </div>
            {markers.map(marker => <div key={`${marker.kind}:${marker.id}`} className={styles.roadmapRow}>
              <div className={styles.roadmapTrack} style={{ width, height: 62, backgroundSize: `${100 / ticks}% 100%` }}>
                <div className={`${styles.eventMarker} ${marker.kind === 'milestone' ? styles.milestoneMarker : ''}`}
                  style={{ left: position(marker.day) }} role="img" aria-label={`${marker.kind === 'milestone' ? 'Milestone' : 'Deadline'}: ${marker.label}, ${date(marker.day)}`}>
                  {marker.kind === 'milestone' ? <span className="material-icons" aria-hidden="true">star</span> : <CheckeredFlag />}
                  <span className={styles.eventMarkerLabel}>{marker.label}</span>
                </div>
              </div>
            </div>)}
            {!roadmap.error && groups.map(group => <React.Fragment key={group.name ?? 'project'}>
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
                      const hasUnmitigatedRisks = task.risks?.some(risk => risk.mitigations.length === 0);
                      const color = barColors[taskIndex % barColors.length] ?? '#1565c0';
                      const label = `${task.text}: ${date(start)} to ${date(end)}, ${end - start} days${estimated ? ', estimated' : ''}`;
                      const assignees = task.people.length > 0 && <span className={styles.assignees}>{task.people.map(person => {
                        const url = avatars.get(person.name);
                        return <span key={person.name} role="img" aria-label={person.name} title={person.name}
                          className={styles.assignee} style={url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined}>
                          {!url && person.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}
                        </span>;
                      })}</span>;
                      const minBarWidth = 36 + task.people.length * 18 + (hasUnmitigatedRisks ? 22 : 0);
                      const barStyle = { backgroundColor: color, borderColor: hasUnmitigatedRisks ? '#c5221f' : color, color: readableTextColor(color), minWidth: minBarWidth };
                      const barClass = `${styles.roadmapBar} ${hasUnmitigatedRisks ? styles.riskBar : ''} ${estimated ? styles.estimatedBar : ''} ${selectedId === task.id && canManage ? styles.selectedBar : ''} ${pickingTask ? styles.pickableBar : ''}`;
                      return <div key={task.id} className={styles.roadmapItem}
                        style={{ left: position(start), width: `${(end - start) / days * 100}%`, top: itemLevel * 56, ...(hasUnmitigatedRisks ? { minWidth: minBarWidth } : {}) }}>
                        {canManage
                          ? <button type="button" className={barClass}
                            style={barStyle}
                            aria-label={milestoneSelection ? `Select milestone task: ${label}` : selecting ? `Select prerequisite: ${label}` : label}
                            aria-pressed={selectedId === task.id}
                            title={selecting ? `${selectedTask?.text} depends on ${task.text}` : `${task.text} · ${date(start)} – ${date(end)}${estimated ? ' · Estimated: 1 day' : ''}${task.dueDate ? ` · Due ${task.dueDate.slice(0, 10)}` : ''}`}
                            onClick={event => chooseBar(task, event.currentTarget)}>
                            {assignees}<span className={styles.estimateLabel}>{effort}</span>
                          </button>
                          : <div className={barClass}
                            style={barStyle}
                            role="img" aria-label={label}
                            title={`${task.text} · ${date(start)} – ${date(end)}${estimated ? ' · Estimated: 1 day' : ''}${task.dueDate ? ` · Due ${task.dueDate.slice(0, 10)}` : ''}`}>
                            {assignees}<span className={styles.estimateLabel}>{effort}</span>
                          </div>}
                        {hasUnmitigatedRisks && (onShowUnmitigatedRisks
                            ? <button type="button" className={styles.roadmapRiskWarning}
                              aria-label={`View unmitigated risks for ${task.text}`} title="View unmitigated risks"
                              onClick={onShowUnmitigatedRisks}>
                              <span className="material-icons" aria-hidden="true">error</span>
                            </button>
                            : <span className={styles.roadmapRiskWarning} role="img" aria-label={`Unmitigated risks for ${task.text}`}>
                              <span className="material-icons" aria-hidden="true">error</span>
                            </span>)}
                        <span className={styles.roadmapLabel} title={`${section}: ${task.text} · ${effort}`}
                          style={{ maxWidth: end === start || taskIndex === lane.length - 1 ? 180 : '100%' }}>
                          <span className={styles.roadmapTaskName}>{task.text}</span>
                        </span>
                      </div>;
                    })}
                  </div>
                </div>
                {editingEntry && editingTask && <div ref={editorRef} className={styles.roadmapEditor} role="region" aria-label={`Edit ${editingTask.text}`}
                  style={viewportWidth ? { width: viewportWidth } : undefined}>
                  <TaskModal task={editingTask} inline allPeople={assignablePeople} onUpdateTask={editTask}
                    onSave={() => setEditing(null)} onClose={() => setEditing(null)} />
                  <button type="button" className={styles.closeEditor} onClick={() => { setEditing(null); triggerRef.current?.focus(); }}>Done</button>
                </div>}
                </React.Fragment>;
              })}
            </React.Fragment>)}
          </div>
        </div>
      </>}
    <RoadmapEventTables milestones={milestones} deadlines={deadlines} tasks={tasks} canManage={canEditEvents}
      addingDeadline={addingDeadline} onCloseDeadline={() => setAddingDeadline(false)}
      onAddMilestone={startMilestone} onAddDeadline={startDeadline}
      onMilestonesChange={saveMilestones} onDeadlinesChange={saveDeadlines}
      onSelectDependency={(id, trigger) => {
        triggerRef.current = trigger;
        setSelecting(false);
        setMilestoneSelection({ id });
        setError('');
        scrollRef.current?.scrollIntoView?.({ block: 'nearest' });
      }} />
  </section>;
}
