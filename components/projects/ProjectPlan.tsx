'use client';

import CompletedTaskIcon from './CompletedTaskIcon';

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProjectItem, ProjectMilestone, ProjectTask } from '@myorg/types';
import { generateId } from '@myorg/utils';
import { createProjectsApiClient } from '@myorg/api-client';
import RoadmapEventTables from './RoadmapEventTables';
import { ModalOverlay, TaskModal } from '@myorg/ui';
import {
  getLinkWarning, getPlanLayers, getPlanNodes, getSectionSequence, isRequirement, linkKey, planKey,
  parsePlanLinks, validatePlanLinks, type PlanLink, type PlanNode,
} from '@/lib/projects/planning';
import styles from './ProjectPlan.module.css';
import { updateProjectTask } from '@/lib/projects/taskUpdates';
import { getProjectMemberContacts } from '@/lib/client/projectMembers';
import { usePlanLinks } from './usePlanLinks';
import PlanSaveStatus from './PlanSaveStatus';
import ProjectViewHelp from './ProjectViewHelp';
import taskDialogStyles from './ProjectEditorTaskDialog.module.css';

type Props = {
  project: ProjectItem;
  canManage: boolean;
  actionsContainer?: HTMLElement | null;
  onLinksSaved?: (links: PlanLink[]) => void;
  onSaveLink?: (action: 'add' | 'remove', link: PlanLink) => Promise<PlanLink[]>;
  onSaveLinks?: (links: PlanLink[]) => Promise<PlanLink[]>;
  onApplyChange?: (updated: Partial<ProjectItem>) => void;
  onCreateDependencyTask?: (dependentTaskId: string, task: ProjectTask) => Promise<ProjectItem>;
};

const EMPTY_LINKS: PlanLink[] = [];
const mapNodeWidth = 156;
const mapNodeHeight = 44;
const mapColumnGap = 40;
const mapRowGap = 16;

export default function ProjectPlan({ project, canManage, actionsContainer, onLinksSaved, onSaveLink, onSaveLinks, onApplyChange, onCreateDependencyTask }: Props) {
  const [subprojects, setSubprojects] = useState(project.subprojects);
  const subprojectsRef = useRef(subprojects);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const { links, saveState, save: saveLink, saveMany, acceptSavedLinks, dismissError: dismissSaveError } = usePlanLinks({
    projectId: project.id, initialLinks: project.planningLinks ?? EMPTY_LINKS, onSaveLink, onSaveLinks, onLinksSaved,
  });
  const [selectedKey, setSelectedKey] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [selectingDependent, setSelectingDependent] = useState(false);
  const [milestones, setMilestones] = useState(project.milestones ?? []);
  const [milestoneSelection, setMilestoneSelection] = useState<{ id: string | null } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const cancelClearRef = useRef<HTMLButtonElement>(null);
  const [sequenceNotice, setSequenceNotice] = useState('');
  const [graphTarget, setGraphTarget] = useState<{ kind: 'node' | 'link'; key: string } | null>(null);
  const selectionActiveRef = useRef(false);
  const addRef = useRef<HTMLButtonElement | null>(null);
  const graphTriggerRef = useRef<HTMLButtonElement | SVGGElement | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const zoomAnchorRef = useRef<{ x: number; y: number; left: number; top: number; ratio: number } | null>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const mapId = useId();
  const clearTitleId = `${mapId}-clear-title`;
  const [taskCreation, setTaskCreation] = useState<{ dependentTaskId: string; task: ProjectTask } | null>(null);
  const creationOpen = taskCreation !== null;
  const [creationError, setCreationError] = useState('');
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const creationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const planningProject = useMemo(() => ({ ...project, subprojects }), [project, subprojects]);
  const nodes = useMemo(() => getPlanNodes(planningProject), [subprojects]);
  const tasks = subprojects.flatMap(section => section.tasks);
  const editingTask = tasks.find(task => task.id === editingTaskId);
  const assignablePeople = useMemo(() => getProjectMemberContacts(project.members ?? []), [project.members]);
  const byKey = useMemo(() => new Map(nodes.map(node => [node.key, node])), [nodes]);
  const selected = byKey.get(selectedKey);
  const graphNode = graphTarget?.kind === 'node' ? byKey.get(graphTarget.key) : undefined;
  const graphLink = graphTarget?.kind === 'link' ? links.find(link => linkKey(link) === graphTarget.key) : undefined;
  const graphError = validatePlanLinks(nodes, links);
  const existingLinks = new Set(links.map(linkKey));
  const missingLinks = links.filter(link => !byKey.has(planKey(link.dependent)));
  const linkedKeys = new Set(links.flatMap(link => [planKey(link.prerequisite), planKey(link.dependent)]));
  const layers = getPlanLayers(nodes.filter(node => linkedKeys.has(node.key)), links);
  const positioned = layers.flatMap((layer, column) => layer.map((node, row) => ({
    node, x: 12 + column * (mapNodeWidth + mapColumnGap), y: 12 + row * (mapNodeHeight + mapRowGap),
  })));
  const positions = new Map(positioned.map(item => [item.node.key, item]));
  const mapWidth = Math.max(180, layers.length * (mapNodeWidth + mapColumnGap) - mapColumnGap + 24);
  const mapHeight = Math.max(68, Math.max(0, ...layers.map(layer => layer.length)) * (mapNodeHeight + mapRowGap) - mapRowGap + 24);
  const name = (key: string) => byKey.get(key)?.text ?? 'Deleted item';

  useEffect(() => {
    setMilestones(project.milestones ?? []);
  }, [project.milestones]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('project-view-active', { detail: 'plan' }));
    return () => {
      window.dispatchEvent(new CustomEvent('project-view-active', { detail: null }));
    };
  }, []);

  useEffect(() => {
    setSubprojects(project.subprojects);
    subprojectsRef.current = project.subprojects;
  }, [project.subprojects]);
  function editTask(task: ProjectTask) {
    if (!canManage || !onApplyChange) return;
    const section = subprojectsRef.current.find(item => item.tasks.some(item => item.id === task.id));
    if (!section) { setError('This task no longer exists. Reload the project before editing.'); return; }
    const updated = updateProjectTask(subprojectsRef.current, section.id, task.id, () => task);
    subprojectsRef.current = updated;
    setSubprojects(updated);
    onApplyChange({ subprojects: updated });
  }
  useEffect(() => {
    if (!creationOpen) creationTriggerRef.current?.focus();
  }, [creationOpen]);

  function closeTaskCreation() {
    if (creatingRef.current) return;
    setTaskCreation(null);
    setCreationError('');
  }

  function startTaskCreation(node: PlanNode, trigger: HTMLButtonElement) {
    creationTriggerRef.current = trigger;
    setEditingTaskId(null);
    setGraphTarget(null);
    setSelectedKey(node.key);
    setCreationError('');
    setTaskCreation({
      dependentTaskId: node.ref.id,
      task: { id: generateId(), text: '', done: false, dueDate: null, favorite: false, people: [] },
    });
  }

  async function createDependencyTask(task: ProjectTask) {
    if (!canManage || !taskCreation || creatingRef.current) return;
    const text = task.text.trim();
    if (!text) { setCreationError('Enter a task name to continue.'); return; }
    if (task.recurrence) { setCreationError('Recurring tasks cannot be task requirements yet.'); return; }
    creatingRef.current = true;
    setCreating(true);
    setCreationError('');
    try {
      const saved = await (onCreateDependencyTask
        ? onCreateDependencyTask(taskCreation.dependentTaskId, { ...task, text })
        : createProjectsApiClient().createDependencyTask(project.id, taskCreation.dependentTaskId, { ...task, text }));
      const savedLinks = parsePlanLinks(saved.planningLinks);
      if (!savedLinks || !saved.subprojects.some(section => section.tasks.some(item => item.id === task.id)) ||
        !savedLinks.some(link => link.prerequisite.kind === 'task' && link.prerequisite.id === task.id &&
          link.dependent.kind === 'task' && link.dependent.id === taskCreation.dependentTaskId)) {
        throw new Error('The server returned an invalid dependency task. Reload the project before retrying.');
      }
      subprojectsRef.current = saved.subprojects;
      setSubprojects(saved.subprojects);
      acceptSavedLinks(savedLinks, 'Dependency task created. Saved.');
      setTaskCreation(null);
    } catch (failure) {
      setCreationError(failure instanceof Error ? failure.message : 'Unable to create the dependency task. Please retry.');
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!event.deltaY) return;
      const previous = zoomRef.current;
      const next = Math.max(0.5, Math.min(2, previous * Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.04 : event.deltaMode === 2 ? 0.5 : 0.002))));
      if (next === previous) return;
      const rect = map.getBoundingClientRect();
      const x = event.clientX - rect.left - map.clientLeft - 4;
      const y = event.clientY - rect.top - map.clientTop - 4;
      const pending = zoomAnchorRef.current;
      zoomAnchorRef.current = {
        x, y, left: map.scrollLeft, top: map.scrollTop,
        ratio: pending ? pending.ratio * next / previous : next / previous,
      };
      zoomRef.current = next;
      setZoom(next);
    };
    map.addEventListener('wheel', wheel, { passive: false });
    return () => map.removeEventListener('wheel', wheel);
  }, [links.length, graphError]);
  useLayoutEffect(() => {
    const map = mapRef.current;
    const anchor = zoomAnchorRef.current;
    if (map && anchor) {
      map.scrollLeft = (anchor.left + anchor.x) * anchor.ratio - anchor.x;
      map.scrollTop = (anchor.top + anchor.y) * anchor.ratio - anchor.y;
      zoomAnchorRef.current = null;
    }
  }, [zoom]);
  useEffect(() => {
    if (selecting) promptRef.current?.focus();
    else if (selectionActiveRef.current) addRef.current?.focus();
    selectionActiveRef.current = !!selecting;
  }, [selecting, selectingDependent]);
  useEffect(() => {
    if (!confirmClear) return;
    const trigger = clearButtonRef.current;
    cancelClearRef.current?.focus();
    return () => trigger?.focus();
  }, [confirmClear]);

  function linkSectionInOrder(sectionId: string) {
    if (!canManage || saveState.status === 'saving') return;
    setError('');
    setSequenceNotice('');
    const section = subprojectsRef.current.find(item => item.id === sectionId);
    if (!section) {
      setError('This section no longer exists. Reload the project before linking tasks.');
      return;
    }
    const sequence = getSectionSequence(section, links);
    if (sequence.tasks.length < 2) {
      setError('At least two non-recurring tasks are needed to link tasks in order.');
      return;
    }
    const reason = validatePlanLinks(nodes, [...links, ...sequence.additions]);
    if (reason) { setError(reason); return; }
    const exclusions = sequence.excluded.length
      ? ` Recurring tasks excluded: ${sequence.excluded.map(task => task.text || 'Untitled task').join(', ')}.`
      : '';
    if (!sequence.additions.length) {
      setSequenceNotice(`These tasks are already linked in this order.${exclusions}`);
      return;
    }
    void saveMany(sequence.additions, `Tasks linked in order.${exclusions}`);
  }

  function clearDependencies() {
    if (!canManage || saveState.status === 'saving') return;
    setConfirmClear(false);
    setGraphTarget(null);
    setSelectedKey('');
    setSelecting(false);
    setSelectingDependent(false);
    setError('');
    links.forEach(link => {
      void saveLink('remove', link, 'Dependencies cleared.');
    });
  }

  function cancelSelection() {
    setMilestoneSelection(null);
    setSelecting(false);
    setSelectingDependent(false);
    setSelectedKey('');
    setError('');
  }

  function startSelection(node: PlanNode, trigger: HTMLButtonElement) {
    setMilestoneSelection(null);
    addRef.current = trigger;
    setGraphTarget(null);
    setSelectedKey(node.key);
    setSelecting(true);
    setSelectingDependent(false);
    setError('');
  }

  function chooseLink(link: PlanLink, trigger: SVGGElement) {
    if (selecting || !canManage) return;
    graphTriggerRef.current = trigger;
    setGraphTarget({ kind: 'link', key: linkKey(link) });
    setSelectedKey('');
    setError('');
  }

  const candidateError = (node: PlanNode): string | null => {
    if (!selecting) return null;
    if (milestoneSelection) {
      const milestone = milestones.find(item => item.id === milestoneSelection.id);
      if (milestoneSelection.id && !milestone) return 'This milestone no longer exists. Cancel and try again.';
      const ids = node.ref.kind === 'task' ? milestone?.taskIds : milestone?.sectionIds;
      return ids?.includes(node.ref.id) ? 'Already linked.' : null;
    }
    if (selectingDependent) return node.ref.kind === 'task' ? null : 'Select a task to add a dependency.';
    if (!selected) return 'The selected item no longer exists. Cancel and choose another item.';
    const link: PlanLink = { dependent: selected.ref, prerequisite: node.ref };
    if (existingLinks.has(linkKey(link))) return 'Already linked.';
    return validatePlanLinks(nodes, [...links, link]);
  };

  function mutate(action: 'add' | 'remove', link: PlanLink) {
    if (!canManage) return;
    setError('');
    setSelecting(false);
    if (action === 'remove' && graphTarget?.kind === 'link' && graphTarget.key === linkKey(link)) {
      setGraphTarget(null);
      tableRef.current?.focus();
    }
    void saveLink(action, link, action === 'add'
      ? `${name(planKey(link.dependent))} depends on ${name(planKey(link.prerequisite))}.`
      : 'Dependency removed.');
  }
  function chooseNode(node: PlanNode) {
    if (selecting) {
      const reason = candidateError(node);
      if (reason) { setError(reason); return; }
      if (milestoneSelection) {
        const milestone = milestones.find(item => item.id === milestoneSelection.id);
        const dependency = node.ref.kind === 'task' ? { taskIds: [...(milestone?.taskIds ?? []), node.ref.id] }
          : { sectionIds: [...(milestone?.sectionIds ?? []), node.ref.id] };
        saveMilestones(milestone
          ? milestones.map(item => item.id === milestone.id ? { ...item, ...dependency } : item)
          : [...milestones, { id: generateId(), label: node.text, taskIds: [], ...dependency }]);
        cancelSelection();
        return;
      }
      if (selectingDependent) {
        setSelectedKey(node.key);
        setSelectingDependent(false);
        setError('');
        return;
      }

      if (selected) mutate('add', { prerequisite: node.ref, dependent: selected.ref });
      return;
    }
    setSelectedKey(node.key);
    setError('');
  }

  function saveMilestones(items: ProjectMilestone[]) {
    if (!canManage || !onApplyChange) return;
    setMilestones(items);
    onApplyChange({ milestones: items });
  }

  function startMilestone(id: string | null, trigger: HTMLButtonElement) {
    if (!canManage || !onApplyChange) return;
    addRef.current = trigger;
    setEditingTaskId(null);
    setGraphTarget(null);
    setSelectedKey('');
    setSelectingDependent(false);
    setMilestoneSelection({ id });
    setSelecting(true);
    setError('');
    tableRef.current?.scrollIntoView?.({ block: 'nearest' });
  }

  function nodeCard(node: PlanNode) {
    const reason = candidateError(node);
    const action = selectingDependent ? 'Select task' : selecting ? 'Select prerequisite' : 'Inspect';
    return (
      <button
        type="button"
        className={`${styles.node} ${node.ref.kind === 'section' ? styles.section : ''}`}
        aria-pressed={selectedKey === node.key}
        aria-label={`${action}: ${node.text} (${node.ref.kind}, ${node.context})`}
        aria-disabled={!!reason}
        title={reason ?? `${node.text} (${node.ref.kind === 'section' ? 'Section' : node.summary})`}
        onClick={event => {
          if (!selecting) {
            setGraphTarget(canManage ? { kind: 'node', key: node.key } : null);
            graphTriggerRef.current = event.currentTarget;
          }
          chooseNode(node);
        }}
      >
        {node.ref.kind === 'task' && node.done && <CompletedTaskIcon />}
        <span className={styles.nodeTitle}>{node.text}</span>
        {reason && selectedKey !== node.key && <span className={styles.srOnly}>{reason}</span>}
      </button>
    );
  }

  function dependencyList(items: PlanLink[], compact = false) {
    return <ul className={styles.links}>{items.map(link => {
      const warning = getLinkWarning(link, nodes);
      const dependent = name(planKey(link.dependent));
      const prerequisite = name(planKey(link.prerequisite));
      return <li key={linkKey(link)}>
        <div className={styles.relationship}>
          <span title={`${dependent} depends on ${prerequisite}`}>{!compact && <><strong>{dependent}</strong> depends on </>}<strong>{prerequisite}</strong></span>
          {!isRequirement(link) && <small title="Section hint">Hint<span className={styles.srOnly}>Section hint</span></small>}
          {canManage && <button type="button" disabled={!!selecting}
            aria-label={`Remove dependency: ${dependent} depends on ${prerequisite}`}
            title={`Remove dependency: ${dependent} depends on ${prerequisite}`}
            onClick={() => mutate('remove', link)}>{compact ? '×' : 'Remove'}</button>}
          {warning && <details className={styles.warning}><summary title={warning}>Warning</summary><p>{warning}</p></details>}
        </div>
      </li>;
    })}</ul>;
  }

  const graphActions = canManage && !selecting && (graphNode || graphLink) ? (
    <div className={styles.graphActions} role="group" aria-label="Selected graph item">
      <span className={styles.actionLabel}>{graphNode?.text ?? (graphLink && `${name(planKey(graphLink.dependent))} depends on ${name(planKey(graphLink.prerequisite))}`)}</span>
      {graphNode && <button type="button" disabled={!!graphError} onClick={event => {
        const trigger = graphTriggerRef.current;
        startSelection(graphNode, trigger instanceof HTMLButtonElement ? trigger : event.currentTarget);
      }}><span className="material-icons" aria-hidden="true">add_link</span>Add dependency</button>}
      {graphNode?.ref.kind === 'task' && onApplyChange && <button type="button" onClick={() => {
        setEditingTaskId(graphNode.ref.id);
      }}>
        <span className="material-icons" aria-hidden="true">edit</span>Edit
      </button>}
      {graphLink && <button type="button" className={styles.removeAction} onClick={() => mutate('remove', graphLink)}>
        <span className="material-icons" aria-hidden="true">link_off</span>Remove dependency
      </button>}
    </div>
  ) : null;

  return (
    <section className={styles.plan} aria-label={`${project.text} project plan`} onKeyDown={event => {
      if (editingTaskId) return;
      if (event.key === 'Escape' && selecting) {
        event.stopPropagation();
        cancelSelection();
      } else if (event.key === 'Escape' && graphTarget) {
        event.stopPropagation();
        setGraphTarget(null);
        graphTriggerRef.current?.focus();
      }
    }}>
      {actionsContainer ? createPortal(graphActions, actionsContainer) : graphActions}
      {selecting && <div className={styles.selection}>
        <p ref={promptRef} tabIndex={-1}>
          {milestoneSelection ? 'Select a task or section in the Dependency Table for the milestone'
            : selectingDependent ? 'Select a task to add a dependency.' : 'Select what it depends on'}
        </p>
        <button type="button" onClick={cancelSelection}>Cancel</button>
      </div>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {sequenceNotice && <p role="status" className={styles.status}>{sequenceNotice}</p>}
      <PlanSaveStatus state={saveState} onDismiss={dismissSaveError} />
      {graphError && <p role="alert" className={styles.error}>{graphError} Remove invalid dependencies below to repair the plan.</p>}

        {links.length > 0 && !graphError && <>
          <h3 className={styles.sectionHeading}>Dependency Graph</h3>
          <div className={styles.graphTile}>
          <div className={styles.zoomHint} aria-hidden="true"><span className="material-icons">mouse</span><span className="material-icons">unfold_more</span><span>Scroll to zoom</span></div>
          <div ref={mapRef} className={styles.map} role="region" aria-label="Dependency map" tabIndex={0} data-tab-swipe-ignore="true">
            <svg width={mapWidth * zoom} height={mapHeight * zoom} viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
              <defs>
                <marker id={`${mapId}-arrow`} viewBox="0 0 8 6" refX="8" refY="3" markerWidth="8" markerHeight="6" markerUnits="userSpaceOnUse" orient="auto"><path d="M 0 0 L 8 3 L 0 6 z" fill="#000000" /></marker>
                <marker id={`${mapId}-selected-arrow`} viewBox="0 0 8 6" refX="8" refY="3" markerWidth="8" markerHeight="6" markerUnits="userSpaceOnUse" orient="auto"><path d="M 0 0 L 8 3 L 0 6 z" fill="var(--color-accent, #d32998)" /></marker>
              </defs>
              <g>{links.map(link => {
                const from = positions.get(planKey(link.prerequisite));
                const to = positions.get(planKey(link.dependent));
                if (!from || !to) return null;
                const start = from.x + mapNodeWidth;
                const end = to.x - 4;
                const fromY = from.y + mapNodeHeight / 2;
                const toY = to.y + mapNodeHeight / 2;
                // Keep the entire arrowhead on a straight landing, clear of the bend.
                const landing = end - 10;
                const bend = (landing - start) / 2;
                const path = `M ${start} ${fromY} C ${start + bend} ${fromY}, ${landing - bend} ${toY}, ${landing} ${toY} L ${end} ${toY}`;
                return <g key={linkKey(link)} className={styles.edge}
                  role={canManage ? 'button' : undefined} tabIndex={canManage && !selecting ? 0 : undefined}
                  aria-label={`Dependency: ${name(planKey(link.dependent))} depends on ${name(planKey(link.prerequisite))}`}
                  aria-pressed={canManage ? graphTarget?.kind === 'link' && graphTarget.key === linkKey(link) : undefined}
                  aria-disabled={canManage ? selecting : undefined}
                  onClick={event => chooseLink(link, event.currentTarget)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      chooseLink(link, event.currentTarget);
                    }
                  }}>
                  <path d={path} fill="none" stroke="transparent" strokeWidth="16" pointerEvents="stroke" />
                  <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={isRequirement(link) ? undefined : '6 5'} markerEnd={`url(#${mapId}-${graphTarget?.kind === 'link' && graphTarget.key === linkKey(link) ? 'selected-arrow' : 'arrow'})`} aria-hidden="true" />
                </g>;
              })}</g>
              {positioned.map(({ node, x, y }) => <foreignObject key={node.key} x={x} y={y} width={mapNodeWidth} height={mapNodeHeight}>{nodeCard(node)}</foreignObject>)}
            </svg>
          </div>
          </div>
        </>}
      <div className={styles.tableHeading}>
        <h3 className={styles.sectionHeading}>Dependency Table</h3>
        {canManage && <button ref={clearButtonRef} type="button" className={styles.clearButton}
          disabled={!links.length || selecting || saveState.status === 'saving'}
          onClick={() => setConfirmClear(true)}>
          <span className="material-icons" aria-hidden="true">link_off</span>Clear dependencies
        </button>}
      </div>
      <ModalOverlay open={confirmClear} onClose={() => setConfirmClear(false)} ariaLabelledby={clearTitleId}
        contentClassName={styles.clearDialog}>
        <div onKeyDown={event => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            setConfirmClear(false);
          } else if (event.key === 'Tab') {
            const buttons = event.currentTarget.querySelectorAll('button');
            const first = buttons[0];
            const last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>
          <h3 id={clearTitleId}>Clear all dependencies?</h3>
          <p>This removes all task requirements and section planning hints from this project. Tasks and sections will not be deleted. This cannot be undone.</p>
          <div className={styles.clearDialogActions}>
            <button ref={cancelClearRef} type="button" onClick={() => setConfirmClear(false)}>Cancel</button>
            <button type="button" className={styles.clearButton} disabled={saveState.status === 'saving'} onClick={clearDependencies}>
              Clear dependencies
            </button>
          </div>
        </div>
      </ModalOverlay>
      <ProjectViewHelp view="plan" />
      {taskCreation && <TaskModal
        key={taskCreation.task.id}
        task={taskCreation.task}
        dialogTitle="Create dependency task"
        dialogDescription={`${tasks.find(task => task.id === taskCreation.dependentTaskId)?.text ?? 'Selected task'} will depend on this new task, in the same section.`}
        beforeFields={creationError && <p className={taskDialogStyles.error} role="alert">{creationError}</p>}
        disabled={creating}
        footer={<div className={taskDialogStyles.actions}>
          <button type="button" className={taskDialogStyles.cancel} disabled={creating} onClick={closeTaskCreation}>Cancel</button>
          <button type="button" className={taskDialogStyles.done} disabled={creating}
            onClick={() => { void createDependencyTask(taskCreation.task); }}>
            <span className="material-icons" aria-hidden="true">add_task</span>{creating ? 'Creating...' : 'Create dependency task'}
          </button>
        </div>}
        allPeople={assignablePeople}
        onUpdateTask={task => setTaskCreation(current => current ? { ...current, task } : current)}
        onSave={task => { void createDependencyTask(task); }}
        onClose={closeTaskCreation}
        closeOnSave={false}
      />}
      <div className={styles.sequence}>
        {!nodes.length && <p className={styles.empty}>Add tasks or sections in Tasks to start planning.</p>}
        {!!nodes.length && <table ref={tableRef} className={styles.table} aria-label="Project dependencies" tabIndex={-1}>
          <thead><tr><th scope="col">Task / Section</th><th scope="col">Depends on</th>{canManage && <th scope="col"><span className={styles.srOnly}>Actions</span></th>}</tr></thead>
          <tbody>{nodes.map(node => {
            const dependencies = links.filter(link => planKey(link.dependent) === node.key);
            return <React.Fragment key={node.key}><tr className={`${node.ref.kind === 'section' ? styles.sectionRow : styles.taskRow} ${selectedKey === node.key ? styles.selectedRow : ''}`}>
              <th scope="row">{node.ref.kind === 'section' && canManage ? (
                <div className={styles.sectionLabel}>
                  {nodeCard(node)}
                  <button type="button" className={styles.sequenceButton}
                    disabled={selecting || saveState.status === 'saving'}
                    aria-label={`Link tasks in order: ${node.text}`}
                    title="Link all non-recurring tasks in this section's current sort order"
                    onClick={() => linkSectionInOrder(node.ref.id)}>Link tasks in order</button>
                </div>
              ) : nodeCard(node)}</th>
              <td>{dependencies.length ? dependencyList(dependencies, true) : <span className={styles.noLinks}>—</span>}</td>
              {canManage && <td className={styles.actions}><button type="button"
                disabled={selecting || !!graphError}
                aria-label={`Add dependency for ${node.text} (${node.ref.kind}, ${node.context})`}
                title={`Add dependency for ${node.text}`}
                onClick={event => startSelection(node, event.currentTarget)}><span className="material-icons" aria-hidden="true">add_link</span></button>
                {node.ref.kind === 'task' && <button type="button"
                  className={styles.createTaskAction}
                  disabled={selecting || !!graphError || node.recurring || saveState.status === 'saving' || creating}
                  aria-label={`Create dependency task for ${node.text} (${node.ref.kind}, ${node.context})`}
                  title={node.recurring ? 'Recurring tasks cannot be task requirements yet.' : `Create dependency task for ${node.text}`}
                  onClick={event => startTaskCreation(node, event.currentTarget)}>
                  <span className="material-icons" aria-hidden="true">add_task</span>
                  <span aria-hidden="true">New task</span>
                </button>}
              </td>}
            </tr>
              {node.ref.kind === 'task' && editingTask?.id === node.ref.id && <TaskModal task={editingTask}
                allPeople={assignablePeople} onUpdateTask={editTask}
                onSave={() => setEditingTaskId(null)} onClose={() => setEditingTaskId(null)} />}
            </React.Fragment>;
          })}</tbody>
        </table>}
        {missingLinks.length > 0 && <section aria-label="Missing items"><h3>Missing items</h3>{dependencyList(missingLinks)}</section>}
      </div>
      <RoadmapEventTables show="milestones" milestones={milestones} deadlines={[]} tasks={tasks} sections={subprojects}
        canManage={canManage && !!onApplyChange} addingDeadline={false} onCloseDeadline={() => {}}
        onAddMilestone={trigger => startMilestone(null, trigger)} onAddDeadline={() => {}}
        onMilestonesChange={saveMilestones} onDeadlinesChange={() => {}}
        onSelectDependency={startMilestone} />
    </section>
  );
}
