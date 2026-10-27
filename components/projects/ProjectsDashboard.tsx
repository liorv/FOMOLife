import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
} from "react";
import type {
  ProjectItem,
  ProjectSubproject,
  ProjectTask,
  ProjectRisk,
} from "@myorg/types";
import { ProjectTile, ProjectLink, EmptyState } from "@myorg/ui";
// JavaScript components imported for now; they'll be migrated later
import ProjectEditor from "./ProjectEditor";
import ProjectAssistant from "./ProjectAssistant";
import DismissibleHint from "../DismissibleHint";
import { advanceRecurringTask } from "@/lib/tasks/recurrence";
import DashboardMetricCard from "./DashboardMetricCard";
import { deleteProjectTask, updateProjectTask } from "@/lib/projects/taskUpdates";
import ProjectImportDialog from "./ProjectImportDialog";
import { TemplateLibrary, TemplateDialog, type TemplateAction } from "./ProjectTemplates";
import templateStyles from "./ProjectTemplates.module.css";
import ProjectPlan from "./ProjectPlan";
import ProjectRoadmap from "./ProjectRoadmap";
import ProjectRisks from "./ProjectRisks";
import ProjectStatus from "./ProjectStatus";
import { getPlanNodes, getTaskPlanLinks, removeTaskPlanLinks, type PlanLink } from "@/lib/projects/planning";
import TaskDependencyDeleteDialog from "./TaskDependencyDeleteDialog";
import ProjectCardDetails from "./ProjectCardDetails";
import { getProjectCardSummary } from "@/lib/projects/cardSummary";

// Helper function to convert hex color to RGB string
function hexToRgb(hex: string | undefined): string {
  if (!hex) return "26, 115, 232"; // default blue
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "26, 115, 232"; // default blue
  return `${parseInt(result[1]!, 16)}, ${parseInt(result[2]!, 16)}, ${parseInt(result[3]!, 16)}`;
}

// ─── Main dashboard component ─────────────────────────────────────────────────

export type WorkspaceView = 'tasks' | 'plan' | 'roadmap' | 'risks' | 'status';
const WORKSPACE_ORDER: WorkspaceView[] = ['tasks', 'plan', 'roadmap', 'risks', 'status'];
const MANAGEMENT_VIEWS = ['plan', 'roadmap', 'risks', 'status'] as const;

// fully typed props for ProjectsDashboard
interface ProjectsDashboardProps {
  onBulkTaskUpdate?: (projectId: string, subprojects: ProjectSubproject[]) => Promise<ProjectItem>;
  onProjectManagementChange?: (projectId: string, enabled: boolean) => Promise<ProjectItem>;
  canManage?: boolean;
  onPlanMutation?: (projectId: string, action: 'add' | 'remove', link: PlanLink) => Promise<PlanLink[]>;
  onPlanBatchMutation?: (projectId: string, links: PlanLink[]) => Promise<PlanLink[]>;
  onCreateDependencyTask?: (projectId: string, dependentTaskId: string, task: ProjectTask) => Promise<ProjectItem>;
  onStatusUpdate?: (projectId: string, patch: import('@myorg/types').ProjectUpdateInput) => Promise<ProjectItem>;
  projects?: ProjectItem[];
  people?: any[];
  selectedProjectId?: string | null;
  selectedTaskId?: string | null;
  locateTaskOnly?: boolean;
  selectedWorkspaceView?: WorkspaceView;
  onWorkspaceChange?: (view: WorkspaceView) => void;
  selectedSubprojectId?: string | null;
  onSelectSubproject?: (id: string | null) => void;
  onSelectProject?: (id: string | null) => void;
  onApplyChange?: (projectId: string, updated: Partial<ProjectItem>) => void;
  onAddSubproject?: (projectId: string, name: string) => void;
  newlyAddedSubprojectId?: string | null;
  onClearNewSubproject?: () => void;
  onSubprojectDeleted?: (payload: { projectId: string; subproject: any; index: number }) => void;
  onConvertSubprojectToProject?: (projectId: string, subprojectId: string) => void;
  onColorChange?: (projectId: string, color: string) => void;
  onOpenColorPicker?: (projectId: string, targetEl: HTMLElement) => void;
  onReorder?: (draggedId: string, targetId: string) => void;
  onDeleteProject?: (id: string) => void;
  pendingDeleteProjectId?: string | null;
  onConfirmDeleteProject?: (id: string) => void;
  onAddProject?: () => void;
  onCreateTemplate?: (name: string) => Promise<void>;
  onUseTemplate?: (templateId: string, name: string) => Promise<void>;
  onConvertTemplate?: (projectId: string, isTemplate: boolean) => Promise<void>;
  onImportProject?: (projectId: string, subprojects: ProjectSubproject[]) => void;
  onOpenPeople?: () => void;
  onCreatePerson?: (name: string) => void;
  onTitleChange?: (projectId: string, title: string) => void;
  projectSearch?: string;
  filters?: string[];
  onToggleFilter?: (filter: string | null) => void;
  currentUserId?: string;
  onInviteMember?: (projectId: string, member: import('@myorg/types').ProjectMember) => void;
  onRemoveMember?: (projectId: string, userId: string) => void;
  onLeave?: (projectId: string) => void;
  onOpenProjectThread?: (project: ProjectItem) => void;
  onOpenTaskThread?: (task: ProjectTask, project: ProjectItem) => void;
  onArchiveProject?: (projectId: string, archived: boolean) => void;
}

type ProjectView = "cards" | "list" | "compact";
const PROJECT_VIEW_ORDER: ProjectView[] = ["cards", "list", "compact"];
const PROJECT_VIEW_STORAGE_KEY = "fomo:projects:view";

function isProjectView(value: string | null): value is ProjectView {
  return value === "cards" || value === "list" || value === "compact";
}

export default function ProjectsDashboard({
  onBulkTaskUpdate,
  onProjectManagementChange,
  canManage = true,
  onPlanMutation,
  onPlanBatchMutation,
  onCreateDependencyTask,
  onStatusUpdate,
  projects = [] as ProjectItem[],
  people = [] as any[],
  selectedProjectId,
  selectedTaskId,
  locateTaskOnly = false,
  selectedWorkspaceView,
  onWorkspaceChange,
  selectedSubprojectId,
  onSelectSubproject,
  onSelectProject,
  onApplyChange,
  onAddSubproject,
  newlyAddedSubprojectId,
  onClearNewSubproject,
  onSubprojectDeleted,
  onConvertSubprojectToProject,
  onColorChange,
  onOpenColorPicker,
  onReorder,
  onDeleteProject,
  pendingDeleteProjectId,
  onConfirmDeleteProject,
  onAddProject,
  onCreateTemplate,
  onUseTemplate,
  onConvertTemplate,
  onImportProject,
  onOpenPeople,
  onCreatePerson,
  onTitleChange,
  projectSearch = "",
  filters = [] as string[],
  onToggleFilter = () => { },
  currentUserId = '',
  onInviteMember,
  onRemoveMember,
  onLeave,
  onOpenProjectThread,
  onOpenTaskThread,
  onArchiveProject,
}: ProjectsDashboardProps) {

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const managementEnabled = selectedProject?.projectManagementEnabled === true;
  const [managementSaves, setManagementSaves] = useState<Record<string, { saving: boolean; error?: string }>>({});
  const managementSave = selectedProject ? managementSaves[selectedProject.id] : undefined;
  const [workspace, setWorkspace] = useState<{ projectId: string; view: Exclude<WorkspaceView, 'tasks'>; riskFilter?: 'unmitigated' } | null>(null);
  const [planActionsContainer, setPlanActionsContainer] = useState<HTMLDivElement | null>(null);
  const [pendingTaskDelete, setPendingTaskDelete] = useState<{
    projectId: string;
    subprojectId: string;
    task: ProjectTask;
    links: PlanLink[];
  } | null>(null);
  const pendingTaskProject = pendingTaskDelete
    ? projects.find(project => project.id === pendingTaskDelete.projectId)
    : undefined;
  const requestedView = selectedWorkspaceView ?? (workspace?.projectId === selectedProject?.id ? workspace?.view : 'tasks');
  const activeView = managementEnabled ? requestedView : 'tasks';
  const showingPlan = activeView === 'plan';
  const showingRoadmap = activeView === 'roadmap';
  const showingRisks = activeView === 'risks';
  const showingStatus = activeView === 'status';
  const showingTasks = !showingPlan && !showingRoadmap && !showingRisks && !showingStatus;
  const workspaceView: WorkspaceView = showingPlan ? 'plan' : showingRoadmap ? 'roadmap' : showingRisks ? 'risks' : showingStatus ? 'status' : 'tasks';
  const [workspaceDirection, setWorkspaceDirection] = useState<'forward' | 'backward' | 'none'>('none');
  const switchWorkspace = (view: WorkspaceView, riskFilter?: 'unmitigated') => {
    if (!selectedProject || view === workspaceView) return;
    setWorkspaceDirection(WORKSPACE_ORDER.indexOf(view) > WORKSPACE_ORDER.indexOf(workspaceView) ? 'forward' : 'backward');
    setWorkspace(view === 'tasks' ? null : { projectId: selectedProject.id, view, ...(riskFilter ? { riskFilter } : {}) });
    onWorkspaceChange?.(view);
  };
  useEffect(() => {
    setWorkspace(null);
    setWorkspaceDirection('none');
  }, [selectedProjectId, selectedTaskId]);
  useEffect(() => {
    if (selectedProject && !managementEnabled && requestedView !== 'tasks') {
      setWorkspace(null);
      onWorkspaceChange?.('tasks');
    }
  }, [selectedProject, managementEnabled, requestedView, onWorkspaceChange]);
  const toggleManagement = async () => {
    if (!selectedProject || !canManage || !onProjectManagementChange || managementSave?.saving) return;
    const projectId = selectedProject.id;
    setManagementSaves(current => ({ ...current, [projectId]: { saving: true } }));
    try {
      await onProjectManagementChange(projectId, !managementEnabled);
      setManagementSaves(current => ({ ...current, [projectId]: { saving: false } }));
    } catch (error) {
      setManagementSaves(current => ({
        ...current, [projectId]: { saving: false, error: error instanceof Error ? error.message : 'Unable to save project management settings. Please retry.' },
      }));
    }
  };
  const taskFilterCount = filters.filter((filter) => filter !== 'hide_completed').length;

  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [projectView, setProjectView] = useState<ProjectView>("cards");
  const [projectAttentionFilter, setProjectAttentionFilter] = useState<'all' | 'blocked' | 'overdue'>('all');
  const projectSummaries = useMemo(() => new Map(projects.map(project => [
    project.id, getProjectCardSummary(project),
  ])), [projects]);
  const [templateAction, setTemplateAction] = useState<TemplateAction | null>(null);
  const templates = useMemo(() => projects.filter(project => project.isTemplate), [projects]);
  useEffect(() => {
    try {
      const savedView = localStorage.getItem(PROJECT_VIEW_STORAGE_KEY);
      if (isProjectView(savedView)) {
        setProjectView(savedView);
      }
    } catch {
      // Keep the default view when browser storage is unavailable.
    }
  }, []);

  const [homeDirection, setHomeDirection] = useState<'forward' | 'backward' | 'none'>('none');
  const selectHomeSection = (templates: boolean) => {
    if (templates === showTemplates) return;
    setHomeDirection(templates ? 'forward' : 'backward');
    setShowTemplates(templates);
  };
  const selectProjectView = (view: ProjectView) => {
    if (view === projectView) return;
    setHomeDirection(PROJECT_VIEW_ORDER.indexOf(view) > PROJECT_VIEW_ORDER.indexOf(projectView) ? 'forward' : 'backward');
    setProjectView(view);
    try {
      localStorage.setItem(PROJECT_VIEW_STORAGE_KEY, view);
    } catch {
      // The selected view still applies for this session if storage is unavailable.
    }
  };

  const visibleProjects = useMemo(
    () => projects.filter((p) => !p.isTemplate && (showArchived ? !!p.archived : !p.archived)
      && (showArchived || projectAttentionFilter === 'all' || projectSummaries.get(p.id)?.[projectAttentionFilter])),
    [projects, showArchived, projectAttentionFilter, projectSummaries],
  );
  const projectGroups = projectView === 'cards' && !showArchived ? [
    { key: 'active', title: 'Active projects', projects: visibleProjects.filter(project => projectSummaries.get(project.id)?.active) },
    { key: 'other', title: 'Other projects', projects: visibleProjects.filter(project => !projectSummaries.get(project.id)?.active) },
  ].filter(group => group.projects.length > 0) : [
    { key: 'all', title: null, projects: visibleProjects },
  ];
  const attentionCounts = {
    blocked: [...projectSummaries.values()].filter(summary => summary.blocked).length,
    overdue: [...projectSummaries.values()].filter(summary => summary.overdue).length,
  };
  const archivedCount = useMemo(() => projects.filter((p) => !p.isTemplate && p.archived).length, [projects]);
  // Switch back to the active view once the archived tab becomes empty (e.g. restoring the last archived project)
  useEffect(() => {
    if (showArchived && archivedCount === 0) {
      setShowArchived(false);
    }
  }, [showArchived, archivedCount]);
  const collapseAllRef = useRef<(() => void) | null>(null);
  const expandAllRef = useRef<(() => void) | null>(null);

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null);
  const [llmUnavailableMsg, setLlmUnavailableMsg] = useState('');
  const [llmProvider, setLlmProvider] = useState<string | null>(null);
  const [threadCounts, setThreadCounts] = useState<Record<string, number>>({});

  // Fetch thread comment counts when project changes
  useEffect(() => {
    if (!selectedProjectId) { setThreadCounts({}); return; }
    fetch(`/api/projects/thread-counts?projectId=${encodeURIComponent(selectedProjectId)}`)
      .then((r) => r.ok ? r.json() : { counts: {} })
      .then((data) => setThreadCounts(data.counts ?? {}))
      .catch(() => setThreadCounts({}));
  }, [selectedProjectId]);

  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((data) => {
        setLlmAvailable(data.available !== false);
        setLlmUnavailableMsg(data.message || '');
        setLlmProvider(data.provider || null);
      })
      .catch(() => {
        setLlmAvailable(false);
        setLlmUnavailableMsg('Could not reach AI service.');
      });
  }, []);

  // Open assistant when thumb button is pressed (global event)
  useEffect(() => {
    const handler = () => {
      setIsAssistantOpen(true);
    };
    window.addEventListener('open-project-assistant', handler as EventListener);
    return () => window.removeEventListener('open-project-assistant', handler as EventListener);
  }, []);

  // Handle add project from the thumb button
  useEffect(() => {
    const handleAdd = () => {
      if (selectedProject) {
        onAddSubproject?.(selectedProject.id, '');
      } else {
        if (showTemplates && onCreateTemplate) setTemplateAction({ kind: 'create' });
        else onAddProject?.();
      }
    };
    window.addEventListener('framework-action-add-project', handleAdd);
    return () => window.removeEventListener('framework-action-add-project', handleAdd);
  }, [selectedProject, onAddSubproject, onAddProject, showTemplates, onCreateTemplate]);

  useEffect(() => {
    if (!selectedProject || !showingTasks || !canManage) return;
    const addSection = () => onAddSubproject?.(selectedProject.id, '');
    window.addEventListener('framework-action-add-section', addSection);
    return () => window.removeEventListener('framework-action-add-section', addSection);
  }, [selectedProject, showingTasks, canManage, onAddSubproject]);

  // Notify thumb that project editor is open/closed so it can show the assistant glyph
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(selectedProject ? 'project-editor-open' : 'project-editor-close'));
    // also ensure we close on unmount
    return () => {
      window.dispatchEvent(new CustomEvent('project-editor-close'));
    };
  }, [selectedProject]);

  

  // ── Combined search results (projects + tasks) ────────────────────────────

  type SearchResultItem =
    | { kind: "project"; project: ProjectItem }
    | { kind: "task"; task: ProjectTask; subproject: ProjectSubproject; project: ProjectItem };

  const searchResults = useMemo<SearchResultItem[] | null>(() => {
    const q = projectSearch.trim();
    if (!q) return null;
    const ql = q.toLowerCase();
    const results: SearchResultItem[] = [];
    for (const p of projects) {
      if (!showArchived && !showTemplates && projectAttentionFilter !== 'all'
        && !projectSummaries.get(p.id)?.[projectAttentionFilter]) continue;
      const projectMatches = (p.text || "").toLowerCase().includes(ql);
      const matchingTasks: { task: ProjectTask; subproject: ProjectSubproject }[] = [];
      for (const sub of p.subprojects || []) {
        for (const task of sub.tasks || []) {
          if ((task.text || "").toLowerCase().includes(ql)) {
            matchingTasks.push({ task, subproject: sub });
          }
        }
      }
      if (projectMatches) {
        results.push({ kind: "project", project: p });
      }
      for (const { task, subproject } of matchingTasks) {
        results.push({ kind: "task", task, subproject, project: p });
      }
    }
    return results;
  }, [projects, projectSearch, projectAttentionFilter, projectSummaries, showArchived, showTemplates]);

  // ── Task mutation helpers (used in combined search results) ───────────────

  const updateTaskInProject = (
    project: ProjectItem,
    subprojectId: string,
    taskId: string,
    patch: Partial<ProjectTask>,
  ) => {
    const completedAt = new Date();
    const updatedSubs = updateProjectTask(
      project.subprojects || [],
      subprojectId,
      taskId,
      (task) => {
        const updated = { ...task, ...patch };
        if (patch.done !== true || task.done !== false) return updated;
        if (updated.recurrence) return advanceRecurringTask(updated, completedAt) ?? updated;
        return { ...updated, completedAt: completedAt.toISOString() };
      },
    );
    onApplyChange?.(project.id, { subprojects: updatedSubs });
  };

  const deleteTaskFromProject = (
    project: ProjectItem,
    subprojectId: string,
    taskId: string,
  ) => {
    if (!canManage) return;
    const task = project.subprojects.find(section => section.id === subprojectId)
      ?.tasks.find(item => item.id === taskId);
    if (!task) return;
    const links = getTaskPlanLinks(project.planningLinks ?? [], taskId);
    if (links.length) {
      setPendingTaskDelete({ projectId: project.id, subprojectId, task, links });
      return;
    }
    const updatedSubs = deleteProjectTask(project.subprojects || [], subprojectId, taskId);
    onApplyChange?.(project.id, { subprojects: updatedSubs });
  };

  const confirmTaskDelete = () => {
    if (!pendingTaskDelete || !canManage) return;
    const project = projects.find(item => item.id === pendingTaskDelete.projectId);
    if (!project) {
      setPendingTaskDelete(null);
      return;
    }
    const updatedSubs = deleteProjectTask(project.subprojects || [], pendingTaskDelete.subprojectId, pendingTaskDelete.task.id);
    onApplyChange?.(project.id, {
      subprojects: updatedSubs,
      planningLinks: removeTaskPlanLinks(project.planningLinks ?? [], pendingTaskDelete.task.id),
    });
    setPendingTaskDelete(null);
  };

  // Tracks which search-result task rows are expanded or being renamed
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [renamingTaskId, setRenamingTaskId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [showImportModal, setShowImportModal] = useState(false);

  // ── Metrics: scoped to selected project when one is selected ──────────────

  const scopedTasks = useMemo(() => {
    const source = selectedProject ? [selectedProject] : visibleProjects;
    return source.flatMap((p) => (p.subprojects || []).flatMap((s) => s.tasks || []));
  }, [visibleProjects, selectedProject]);

  const completedTasks = useMemo(() => scopedTasks.filter((t) => t.done).length, [scopedTasks]);
  const projectProgress = scopedTasks.length
    ? Math.round((completedTasks / scopedTasks.length) * 100)
    : 0;

  const starredCount = useMemo(
    () => scopedTasks.filter((t) => (t as any).starred || t.favorite).length,
    [scopedTasks],
  );

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return scopedTasks.filter((t) => t.dueDate && new Date(t.dueDate) < today).length;
  }, [scopedTasks]);

  const upcomingCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inSeven = new Date(today);
    inSeven.setDate(today.getDate() + 7);
    return scopedTasks.filter((t) => {
      if (t.done || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= today && d <= inSeven;
    }).length;
  }, [scopedTasks]);

  const assignedToMeCount = useMemo(() => {
    if (!currentUserId) return 0;
    const currentUserName = projects.flatMap(p => p.members || []).find(m => m.userId === currentUserId)?.name;
    if (!currentUserName) return 0;
    return scopedTasks.filter(t => t.people?.some(p => p.name === currentUserName)).length;
  }, [scopedTasks, projects, currentUserId]);


  // Clear filter when switching projects
  const handleSelectProject = (id: string | null) => {
    onSelectProject?.(id);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`projects-dashboard${selectedProject ? " dashboard--has-project" : ""}`}>
      {pendingTaskDelete && pendingTaskProject && <TaskDependencyDeleteDialog
        task={pendingTaskDelete.task}
        links={pendingTaskDelete.links}
        nodes={getPlanNodes(pendingTaskProject)}
        onCancel={() => setPendingTaskDelete(null)}
        onConfirm={confirmTaskDelete}
      />}
      {selectedProject ? (
        /* ── Main body: full-width content for selected project ── */
        <div className="dashboard-body">
          <div className="dashboard-content">
            {managementEnabled && <div className={`${templateStyles.toolbar} ${templateStyles.workspaceToolbar}`}>
              <div
                className={templateStyles.segmented}
                role="group"
                aria-label="Project workspace view"
                style={{ '--segment-count': 2, '--segment-index': showingTasks ? 0 : 1 } as React.CSSProperties}
              >
                <span className={templateStyles.segmentThumb} aria-hidden="true" />
                <button type="button" className={templateStyles.segment} aria-pressed={showingTasks} onClick={() => switchWorkspace('tasks')}>Tasks</button>
                <button type="button" className={templateStyles.segment} aria-pressed={!showingTasks} onClick={() => { if (showingTasks) switchWorkspace('plan'); }}>Manage</button>
              </div>
            </div>}
            {/* Project editor (subprojects + tasks) */}
            <ProjectEditor
              canManage={canManage}
              targetTaskId={selectedTaskId ?? null}
              locateTaskOnly={locateTaskOnly}
              workspaceContent={showingPlan ? (
                <ProjectPlan key={selectedProject.id} project={selectedProject} canManage={canManage}
                  actionsContainer={planActionsContainer}
                  {...(onApplyChange ? { onApplyChange: (updated: Partial<ProjectItem>) => onApplyChange(selectedProject.id, updated) } : {})}
                  {...(onPlanMutation ? { onSaveLink: (action, link) => onPlanMutation(selectedProject.id, action, link) } : {})}
                  {...(onPlanBatchMutation ? { onSaveLinks: (links: PlanLink[]) => onPlanBatchMutation(selectedProject.id, links) } : {})}
                  {...(onCreateDependencyTask ? { onCreateDependencyTask: (dependentTaskId, task) => onCreateDependencyTask(selectedProject.id, dependentTaskId, task) } : {})}
                />
              ) : showingRoadmap ? (
                <ProjectRoadmap key={selectedProject.id} project={selectedProject} links={selectedProject.planningLinks ?? []} people={people}
                  canManage={canManage}
                  onShowUnmitigatedRisks={() => switchWorkspace('risks', 'unmitigated')}
                  actionsContainer={planActionsContainer}
                  {...(onApplyChange ? { onApplyChange: (updated: Partial<ProjectItem>) => onApplyChange(selectedProject.id, updated) } : {})}
                  {...(onPlanMutation ? { onSaveLink: (action: 'add' | 'remove', link: PlanLink) => onPlanMutation(selectedProject.id, action, link) } : {})}
                />
              ) : showingRisks ? (
                <ProjectRisks key={selectedProject.id} project={selectedProject} canManage={canManage}
                  initialFilter={workspace?.riskFilter ?? 'all'}
                  {...(onApplyChange ? { onApplyChange: (updated: Partial<ProjectItem>) => onApplyChange(selectedProject.id, updated) } : {})}
                />
              ) : showingStatus ? (
                <ProjectStatus key={selectedProject.id} project={selectedProject} canManage={canManage}
                  {...(onStatusUpdate ? { onSave: (patch: import('@myorg/types').ProjectUpdateInput) => onStatusUpdate(selectedProject.id, patch) } : {})}
                />
              ) : undefined}
              workspaceView={workspaceView}
              workspaceDirection={workspaceDirection}
              taskManagementToggle={
                <>
                  <label className={templateStyles.managementToggle}>
                    <input type="checkbox" role="switch" aria-label="Enable project management"
                      checked={managementEnabled}
                      disabled={!canManage || !onProjectManagementChange || managementSave?.saving}
                      onChange={() => void toggleManagement()} />
                    <span className={templateStyles.managementSwitch} aria-hidden="true" />
                    <span>Project management</span>
                  </label>
                  {managementSave?.error && (
                    <span role="alert">{managementSave.error}</span>
                  )}
                </>
              }
              workspaceNavigation={!showingTasks && (
                <nav aria-label="Manage" className={templateStyles.managementNavigation}>
                  <div className={templateStyles.segmented} role="group" aria-label="Manage sections"
                    style={{ '--segment-count': MANAGEMENT_VIEWS.length, '--segment-index': WORKSPACE_ORDER.indexOf(workspaceView) - 1 } as React.CSSProperties}>
                    <span className={templateStyles.segmentThumb} aria-hidden="true" />
                    {MANAGEMENT_VIEWS.map(view => (
                      <button key={view} type="button" className={templateStyles.segment}
                        aria-pressed={workspaceView === view} onClick={() => switchWorkspace(view)}>
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                      </button>
                    ))}
                  </div>
                </nav>
              )}
              dashboardProjectHeaderTop={(membersBar, overviewButton) => (
                <div
                  className="dashboard-project-header-modern"
                  style={{
                    '--project-color': selectedProject.color || "#1a73e8",
                    '--project-color-rgb': hexToRgb(selectedProject.color || "#1a73e8")
                  } as React.CSSProperties}
                >
                  {selectedProject.isTemplate && (
                    <div className={templateStyles.banner}>
                      <span className="material-icons" aria-hidden="true">dashboard_customize</span>
                      <p><strong>Template</strong> &middot; Changes here apply to future projects, not existing copies.</p>
                      {onUseTemplate && <button type="button" className={templateStyles.primaryButton} onClick={() => setTemplateAction({ kind: 'use', project: selectedProject })}>Use template</button>}
                    </div>
                  )}
                  <div className="dashboard-project-header-main">
                    {overviewButton}
                    <div className="dashboard-project-header-details">
                      <div className="dashboard-project-name-row">
                        <h2
                          className={`dashboard-project-title${selectedProject.externalUrl ? ' dashboard-project-title--linked' : ''}`}
                          contentEditable
                          suppressContentEditableWarning
                          onFocus={(e) => {
                            const range = document.createRange();
                            range.selectNodeContents(e.currentTarget);
                            const selection = window.getSelection();
                            selection?.removeAllRanges();
                            selection?.addRange(range);
                          }}
                          onBlur={(e) => {
                            const newText = e.currentTarget.textContent.trim();
                            if (newText && newText !== selectedProject.text) {
                              onTitleChange?.(selectedProject.id, newText);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                        >
                          {selectedProject.text}
                        </h2>
                        <ProjectLink url={selectedProject.externalUrl} projectName={selectedProject.text} />
                        {showingTasks && membersBar}
                      </div>
                      <div className="dashboard-project-name-accent" />
                      <div className="dashboard-project-progress-row">
                        <div
                          className="dashboard-project-progress"
                          role="progressbar"
                          aria-label={`${selectedProject.text} progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={projectProgress}
                        >
                          <span style={{ width: `${projectProgress}%` }} />
                        </div>
                        <span>{projectProgress}%</span>
                      </div>
                      {!showingTasks && <div ref={setPlanActionsContainer} />}
                    </div>
                  </div>
                </div>
              )}
              taskFilterPanel={showFilters && (
                    <div className="project-actions-bar project-filter-bar">
                      <button
                        className="project-action-btn project-action-btn--close-filters"
                        onClick={() => { setShowFilters(false); onToggleFilter?.(null); }}
                        title="Close filters"
                      >
                        <span className="material-icons">close</span>
                      </button>
                      <DashboardMetricCard
                        icon="person"
                        label="Assigned"
                        value={assignedToMeCount}
                        accent="primary"
                        clickable
                        active={filters.includes('assigned_to_me')}
                        onClick={() => onToggleFilter?.('assigned_to_me')}
                      />
                      <DashboardMetricCard
                        icon="check_circle"
                        label="Completed"
                        value={completedTasks}
                        accent="success"
                        clickable
                        active={filters.includes('completed')}
                        onClick={() => onToggleFilter?.('completed')}
                      />
                      <DashboardMetricCard
                        icon="star"
                        label="Starred"
                        value={starredCount}
                        accent="star"
                        clickable
                        active={filters.includes('starred')}
                        onClick={() => onToggleFilter?.('starred')}
                      />
                      <DashboardMetricCard
                        icon="warning"
                        label="Overdue"
                        value={overdueCount}
                        accent="danger"
                        clickable
                        active={filters.includes('overdue')}
                        onClick={() => onToggleFilter?.('overdue')}
                      />
                      <DashboardMetricCard
                        icon="upcoming"
                        label="Upcoming"
                        value={upcomingCount}
                        accent="info"
                        clickable
                        active={filters.includes('upcoming')}
                        onClick={() => onToggleFilter?.('upcoming')}
                      />
                    </div>
              )}
              taskToolbar={
                <>
                      <button
                        className={`project-action-btn${showFilters || taskFilterCount > 0 ? ' project-action-btn--active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                        title="Filter tasks"
                        aria-label={`Filter tasks${taskFilterCount > 0 ? ` (${taskFilterCount} active)` : ''}`}
                        aria-expanded={showFilters}
                      >
                        <span className="material-icons" aria-hidden="true">filter_list</span>
                        <span>Filter{taskFilterCount > 0 ? ` (${taskFilterCount})` : ''}</span>
                      </button>
                      {onOpenProjectThread && (
                      <button
                        className={`project-action-btn${(threadCounts[`proj:${selectedProject.id}`] ?? 0) > 0 ? ' project-action-btn--has-messages' : ''}`}
                        title={`Project conversation${(threadCounts[`proj:${selectedProject.id}`] ?? 0) > 0 ? ` (${threadCounts[`proj:${selectedProject.id}`]} messages)` : ''}`}
                        aria-label="Project conversation"
                        onClick={() => onOpenProjectThread?.(selectedProject)}
                      >
                        <span className="material-icons" aria-hidden="true">{(threadCounts[`proj:${selectedProject.id}`] ?? 0) > 0 ? 'forum' : 'chat_bubble_outline'}</span>
                        <span>Chat{(threadCounts[`proj:${selectedProject.id}`] ?? 0) > 0 ? ` (${threadCounts[`proj:${selectedProject.id}`]})` : ''}</span>
                      </button>
                      )}
                </>
              }
              projectActions={
                <>
                      {onConvertTemplate && (
                        <button
                          type="button"
                          onClick={() => setTemplateAction({ kind: selectedProject.isTemplate ? 'restore' : 'convert', project: selectedProject })}
                        >
                          <span className="material-icons" aria-hidden="true">{selectedProject.isTemplate ? 'folder_open' : 'dashboard_customize'}</span>
                          <span>{selectedProject.isTemplate ? 'Convert to project' : 'Convert to template'}</span>
                        </button>
                      )}
                      <button
                        title="Export JSON"
                        onClick={() => {
                          const exportObj = buildProjectExport(selectedProject, people);
                          const safeName = (exportObj.name || 'project').replace(/[^a-z0-9_-]/gi, '_');
                          downloadJSON(exportObj, `${safeName}_export.json`);
                        }}
                      >
                        <span className="material-icons" aria-hidden="true">download</span>
                        <span>Export JSON</span>
                      </button>
                      {onImportProject && <button
                        title="Import sub-projects from JSON into this project"
                        onClick={() => setShowImportModal(true)}
                      >
                        <span className="material-icons" aria-hidden="true">upload</span>
                        <span>Import JSON</span>
                      </button>}
                </>
              }
              onToggleFilter={onToggleFilter}
              key={selectedProject.id}
              project={selectedProject}
              targetSubprojectId={selectedSubprojectId ?? null}
              {...(onSelectSubproject ? { onSelectSubproject } : {})}
              onApplyChange={(updated: Partial<ProjectItem>) =>
                onApplyChange?.(selectedProject.id, updated)
              }
              {...(onBulkTaskUpdate ? {
                onBulkTaskUpdate: (subprojects: ProjectSubproject[]) => onBulkTaskUpdate(selectedProject.id, subprojects),
              } : {})}
              {...(onArchiveProject && !selectedProject.isTemplate ? {
                onArchiveToggle: (archived: boolean) => onArchiveProject(selectedProject.id, archived),
              } : {})}
              onAddSubproject={(name: string) => onAddSubproject?.(selectedProject.id, name)}
              newlyAddedSubprojectId={newlyAddedSubprojectId ?? null}
              onClearNewSubproject={onClearNewSubproject ?? (() => { })}
              allPeople={people}
              onOpenPeople={onOpenPeople ?? (() => { })}
              onCreatePerson={onCreatePerson ?? (() => { })}
              onSubprojectDeleted={onSubprojectDeleted ?? (() => { })}
              onConvertSubprojectToProject={(subprojectId) =>
                onConvertSubprojectToProject?.(selectedProject.id, subprojectId)
              }
              taskFilters={filters}
              searchQuery={projectSearch}
              currentUserId={currentUserId}
              onInviteMember={(member) => onInviteMember?.(selectedProject.id, member)}
              {...(onRemoveMember ? {
                onRemoveMember: (userId: string) => onRemoveMember(selectedProject.id, userId),
              } : {})}
              collapseAllRef={collapseAllRef}
              expandAllRef={expandAllRef}
              {...(onOpenTaskThread ? { onTaskChatClick: (task: ProjectTask) => onOpenTaskThread(task, selectedProject) } : {})}
              {...(Object.keys(threadCounts).length > 0 ? {
                taskCommentCounts: Object.fromEntries(
                  Object.entries(threadCounts)
                    .filter(([k, v]) => k.startsWith('task:') && v > 0)
                    .map(([k, v]) => {
                      // key format: "task:{projectId}:{taskId}"
                      const parts = k.split(':');
                      return [parts.slice(2).join(':'), v];
                    })
                )
              } : {})}
            />
            {/* Floating AI assistant FAB (project editor) */}
            {showingTasks && <button
              type="button"
              className={`project-ai-fab${llmAvailable === false ? ' project-ai-fab--unavailable' : ''}`}
              aria-label="Open AI assistant"
              disabled={llmAvailable === false}
              title={llmAvailable === false ? (llmUnavailableMsg || 'AI assistant unavailable') : 'AI assistant'}
              onClick={() => {
                if (llmAvailable === false) return;
                window.dispatchEvent(new CustomEvent('open-project-assistant'));
                setIsAssistantOpen(true);
              }}
            >
              <span className="material-icons">auto_awesome</span>
            </button>}
          </div>
        </div>
      ) : (
        /* ── Home: watermark + direct grid ── */
        <>
          <div className={templateStyles.toolbar}>
            <div
              className={`${templateStyles.segmented} ${templateStyles.segmentedHome}`}
              role="group"
              aria-label="Project views"
              style={{ '--segment-count': 2, '--segment-index': showTemplates ? 1 : 0 } as React.CSSProperties}
            >
              <span className={templateStyles.segmentThumb} aria-hidden="true" />
              <button type="button" className={templateStyles.segment} aria-pressed={!showTemplates} onClick={() => selectHomeSection(false)}>
                <span className="material-icons" aria-hidden="true">folder_open</span>Projects
              </button>
              <button type="button" className={templateStyles.segment} aria-pressed={showTemplates} onClick={() => selectHomeSection(true)}>
                <span className="material-icons" aria-hidden="true">dashboard_customize</span>Templates ({templates.length})
              </button>
            </div>
            <div className={templateStyles.toolbarActions}>
              {!showTemplates && (
                <div
                  className={`${templateStyles.segmented} ${templateStyles.segmentedIcons}`}
                  role="group"
                  aria-label="Project layout"
                  style={{ '--segment-count': PROJECT_VIEW_ORDER.length, '--segment-index': PROJECT_VIEW_ORDER.indexOf(projectView) } as React.CSSProperties}
                >
                  <span className={templateStyles.segmentThumb} aria-hidden="true" />
                  <button
                    type="button"
                    className={templateStyles.segment}
                    aria-label="Cards view"
                    title="Cards view"
                    aria-pressed={projectView === "cards"}
                    onClick={() => selectProjectView("cards")}
                  >
                    <span className="material-icons" aria-hidden="true">dashboard</span>
                  </button>
                  <button
                    type="button"
                    className={templateStyles.segment}
                    aria-label="List view"
                    title="List view"
                    aria-pressed={projectView === "list"}
                    onClick={() => selectProjectView("list")}
                  >
                    <span className="material-icons" aria-hidden="true">view_list</span>
                  </button>
                  <button
                    type="button"
                    className={templateStyles.segment}
                    aria-label="Compact view"
                    title="Compact view"
                    aria-pressed={projectView === "compact"}
                    onClick={() => selectProjectView("compact")}
                  >
                    <span className="material-icons" aria-hidden="true">grid_view</span>
                  </button>
                </div>
              )}
              {!showTemplates && onAddProject && <button type="button" className={templateStyles.primaryButton} onClick={onAddProject}>
                <span className="material-icons" aria-hidden="true">add</span>New project
              </button>}
              {showTemplates && onCreateTemplate && <button type="button" className={templateStyles.primaryButton} onClick={() => setTemplateAction({ kind: 'create' })}>
                <span className="material-icons" aria-hidden="true">add</span>New template
              </button>}
            </div>
          </div>
          {!showTemplates && !showArchived && (
            <div className="project-attention-filters" role="group" aria-label="Filter projects">
              {(['all', 'blocked', 'overdue'] as const).map(filter => (
                <button key={filter} type="button"
                  className={`project-archive-tab${projectAttentionFilter === filter ? ' project-archive-tab--active' : ''}`}
                  aria-pressed={projectAttentionFilter === filter}
                  onClick={() => setProjectAttentionFilter(filter)}>
                  {filter === 'all' ? 'All projects'
                    : `${filter === 'blocked' ? 'Blocked' : 'Overdue'} projects (${attentionCounts[filter]})`}
                </button>
              ))}
            </div>
          )}

          {/* Combined search results (projects + tasks) */}
          <div
            key={showTemplates ? 'templates' : `projects-${projectView}`}
            className={`projects-home-view project-editor-workspace--${homeDirection}`}
            data-home-view={showTemplates ? 'templates' : projectView}
          >
          {showTemplates ? (
            <TemplateLibrary templates={templates} onEdit={handleSelectProject} onUse={onUseTemplate ? project => setTemplateAction({ kind: 'use', project }) : undefined} />
          ) : searchResults !== null ? (
            searchResults.length === 0 ? (
              <p className="sidebar-no-results">
                No matches for &ldquo;{projectSearch}&rdquo;
              </p>
            ) : (
              <div className="search-results-list">
                {searchResults.map((item) => {
                  if (item.kind === "project") {
                    const { project: p } = item;
                    return (
                      <div
                        key={`proj-${p.id}`}
                        className="search-result-row search-result-row--project"
                        onClick={() => handleSelectProject(p.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleSelectProject(p.id)}
                      >
                        <span
                          className="search-result-dot"
                          style={{ background: p.color || "#1a73e8" }}
                        />
                        <span className="search-result-text">{p.text}</span>
                        <span className="search-result-badge">Project</span>
                        <span className="material-icons search-result-chevron">chevron_right</span>
                      </div>
                    );
                  }
                  // task row
                  const { task, subproject, project: p } = item;
                  const isExpanded = expandedTaskIds.has(task.id);
                  const isRenaming = renamingTaskId === task.id;
                  return (
                    <div key={`task-${task.id}`} className={`search-result-row search-result-row--task${task.done ? " search-result-row--done" : ""}`}>
                      {/* Complete toggle */}
                      <button
                        className="search-result-check"
                        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                        title={task.done ? "Mark incomplete" : "Mark complete"}
                        onClick={() => updateTaskInProject(p, subproject.id, task.id, { done: !task.done })}
                      >
                        <span className="material-icons">
                          {task.done ? "check_circle" : "radio_button_unchecked"}
                        </span>
                      </button>

                      {/* Task text / rename input */}
                      <div className="search-result-body">
                        {isRenaming ? (
                          <input
                            className="search-result-rename-input"
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (renameValue.trim()) {
                                  updateTaskInProject(p, subproject.id, task.id, { text: renameValue.trim() });
                                }
                                setRenamingTaskId(null);
                              } else if (e.key === "Escape") {
                                setRenamingTaskId(null);
                              }
                            }}
                            onBlur={() => {
                              if (renameValue.trim()) {
                                updateTaskInProject(p, subproject.id, task.id, { text: renameValue.trim() });
                              }
                              setRenamingTaskId(null);
                            }}
                          />
                        ) : (
                          <span className="search-result-task-text">{task.text}</span>
                        )}
                        <span className="search-result-meta">
                          <span
                            className="search-result-dot search-result-dot--sm"
                            style={{ background: p.color || "#1a73e8" }}
                          />
                          {p.text}
                          {!subproject.isProjectLevel && (
                            <span className="search-result-meta-sep"> › {subproject.text}</span>
                          )}
                          {task.dueDate && (
                            <span className="search-result-due">
                              · due {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                        {/* Expanded description */}
                        {isExpanded && task.description && (
                          <p className="search-result-description">{task.description}</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="search-result-actions">
                        {/* Rename */}
                        <button
                          className="search-result-action-btn"
                          aria-label="Rename task"
                          title="Rename"
                          onClick={() => {
                            setRenameValue(task.text);
                            setRenamingTaskId(task.id);
                          }}
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        {/* Expand (show details) */}
                        <button
                          className="search-result-action-btn"
                          aria-label={isExpanded ? "Collapse task" : "Expand task"}
                          title={isExpanded ? "Collapse" : "Expand"}
                          onClick={() =>
                            setExpandedTaskIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(task.id)) next.delete(task.id);
                              else next.add(task.id);
                              return next;
                            })
                          }
                        >
                          <span className="material-icons">
                            {isExpanded ? "expand_less" : "expand_more"}
                          </span>
                        </button>
                        {/* Go to project */}
                        <button
                          className="search-result-action-btn"
                          aria-label="Open in project"
                          title="Open project"
                          onClick={() => handleSelectProject(p.id)}
                        >
                          <span className="material-icons">open_in_new</span>
                        </button>
                        {/* Delete */}
                        <button
                          className="search-result-action-btn search-result-action-btn--danger"
                          aria-label="Delete task"
                          title="Delete task"
                          onClick={() => deleteTaskFromProject(p, subproject.id, task.id)}
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* No active search — show tile grid */
            projects.length === 0 ? (
              <div className="dashboard-watermark empty-watermark">
                <EmptyState
                  icon="folder_open"
                  title="No projects yet"
                  description="Create your first project to start organizing your tasks"
                />
              </div>
            ) : (
              <>
                <div className="dashboard-drag-hint-row">
                  {visibleProjects.length > 0 && (
                    <DismissibleHint
                      storageKey="project-swipe-actions-hint-dismissed"
                      direction="left"
                      lines={['Swipe left for actions']}
                    />
                  )}
                  <DismissibleHint
                    storageKey="project-drag-reorder-hint-dismissed"
                    direction="down"
                    lines={['drag a project 2 reorder']}
                  />
                </div>
                {archivedCount > 0 && (
                  <div className="project-archive-tabs">
                    <button
                      className={`project-archive-tab${!showArchived ? ' project-archive-tab--active' : ''}`}
                      onClick={() => setShowArchived(false)}
                    >
                      Active
                    </button>
                    <button
                      className={`project-archive-tab${showArchived ? ' project-archive-tab--active' : ''}`}
                      onClick={() => setShowArchived(true)}
                    >
                      Archived ({archivedCount})
                    </button>
                  </div>
                )}
                {visibleProjects.length === 0 ? (
                  <div className="dashboard-watermark empty-watermark">
                    <EmptyState
                      icon={showArchived ? "archive" : "folder_open"}
                      title={showArchived ? "No archived projects" : projectAttentionFilter !== 'all'
                        ? `No ${projectAttentionFilter} projects` : "No active projects"}
                      description={
                        showArchived
                          ? "Projects you mark complete will show up here."
                          : projectAttentionFilter !== 'all' ? "Choose All projects to see the rest of your work."
                            : "Create a new project or use a template. Archived projects can be restored from the Archived tab."
                      }
                    />
                  </div>
                ) : (
                projectGroups.map(group => (
                <section key={group.key} aria-label={group.title ?? (showArchived ? 'Archived projects' : 'Projects')}>
                  {group.title && <h2 className="dashboard-project-group-title">{group.title} <span>({group.projects.length})</span></h2>}
                  <div className={`dashboard-tiles-grid dashboard-tiles-grid--${projectView}`}>
                  {group.projects.map((p) => (
                    <div
                      key={p.id}
                      className="dashboard-tile-wrapper"
                      onClick={() => handleSelectProject(p.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleSelectProject(p.id)}
                    >
                      <ProjectTile
                        project={p}
                        details={projectView === "cards" ? <ProjectCardDetails project={p} /> : undefined}
                        onEdit={handleSelectProject}
                        onTitleChange={onTitleChange}
                        {...(onApplyChange ? {
                          onExternalUrlChange: (id: string, externalUrl: string) => onApplyChange(id, { externalUrl }),
                        } : {})}
                        onDelete={onDeleteProject}
                        onConfirmDelete={onConfirmDeleteProject}
                        isPendingDelete={pendingDeleteProjectId === p.id}
                        onChangeColor={onColorChange}
                        onOpenColorPicker={onOpenColorPicker}
                        onReorder={onReorder}
                        currentUserId={currentUserId}
                        onLeave={onLeave ? () => onLeave(p.id) : undefined}
                        {...(onArchiveProject ? { onArchiveToggle: onArchiveProject } : {})}
                      />
                    </div>
                  ))}
                </div>
                </section>
                ))
                )}
              </>
            )
          )}
          </div>
        </>
      )}

      {templateAction && (
        <TemplateDialog
          action={templateAction}
          onClose={() => setTemplateAction(null)}
          onConfirm={async name => {
            if (templateAction.kind === 'create' && onCreateTemplate) {
              await onCreateTemplate(name);
            } else if (templateAction.kind === 'use' && onUseTemplate) {
              await onUseTemplate(templateAction.project.id, name);
              setShowTemplates(false);
            } else if ((templateAction.kind === 'convert' || templateAction.kind === 'restore') && onConvertTemplate) {
              await onConvertTemplate(templateAction.project.id, templateAction.kind === 'convert');
              setShowTemplates(templateAction.kind === 'convert');
            } else {
              throw new Error('This template action is not available.');
            }
          }}
        />
      )}

      {isAssistantOpen && selectedProject && (
        <ProjectAssistant
          projectExport={buildAIContext(selectedProject, people)}
          onClose={() => {
            setIsAssistantOpen(false);
            window.dispatchEvent(new CustomEvent('close-project-assistant'));
          }}
          onApplyChange={onApplyChange}
          project={selectedProject}
          onAddSubproject={(title: string) => onAddSubproject?.(selectedProject.id, title)}
          providerLabel={llmProvider}
        />
      )}

      {showImportModal && (
        <ProjectImportDialog
          projectName={selectedProject?.text ?? ""}
          onClose={() => setShowImportModal(false)}
          onImport={(subprojects) => {
            if (selectedProject) onImportProject?.(selectedProject.id, subprojects);
            setShowImportModal(false);
          }}
        />
      )}

    </div>
  );
}

// Build a complete, LLM-friendly export object from a ProjectItem
/** Slim context sent to the AI — only what the LLM needs to make edits.
 *  Includes task IDs so edits can be matched back to real tasks on apply. */
function buildAIContext(proj: ProjectItem | any, _people: any[] = []) {
  return {
    name: proj.text ?? proj.title ?? '',
    goal: proj.goal ?? null,
    description: proj.description ?? null,
    end_date: proj.dueDate ?? null,
    special_instructions: proj.aiInstructions ?? null,
    sub_projects: (proj.subprojects || []).map((s: any) => ({
      id: s.id,
      title: s.title ?? s.text ?? '',
      tasks: (s.tasks || []).map((t: any) => ({
        id: t.id,
        title: t.text ?? t.description ?? '',
        effort: t.effort ?? null,
        done: t.done ?? false,
        due_date: t.dueDate ?? null,
        notes: t.notes ?? t.detailedDescription ?? null,
        owners: (t.people || []).map((p: any) => p.name ?? p),
      }))
    })),
  };
}

function buildProjectExport(proj: ProjectItem | any, people: any[] = []) {
  const { subprojects: _sub, id: _id, ...rest } = proj as any;
  // Strip any remaining id-like keys from metadata to prevent leaking internal identifiers
  const { id: _mid, userId: _uid, planningLinks: _plan, ...safeMetadata } = rest as any;

  return {
    name: proj.text ?? proj.title ?? '',
    color: proj.color ?? null,
    metadata: safeMetadata,
    sub_projects: (proj.subprojects || []).map((s: any) => ({
      title: s.title ?? s.text ?? '',
      isProjectLevel: !!s.isProjectLevel,
      description: s.description ?? null,
      color: s.color ?? null,
      owners: (s.owners ?? []).map((o: any) => ({ name: o?.name ?? String(o) })),
      tasks: (s.tasks || []).map((t: any) => ({
        description: t.description ?? t.text ?? '',
        effort: t.effort ?? null,
        dueDate: t.dueDate ?? null,
        done: !!t.done,
        ...(t.status !== undefined ? { status: t.status } : {}),
        ...(t.scheduleHealth !== undefined ? { scheduleHealth: t.scheduleHealth } : {}),
        ...(t.delayDays !== undefined ? { delayDays: t.delayDays } : {}),
        ...(t.statusUpdates ? { statusUpdates: t.statusUpdates.map((update: { text: string }) => ({ text: update.text })) } : {}),
        favorite: (t as any).favorite ?? null,
        ...(t.risks ? { risks: t.risks.map((risk: ProjectRisk) => ({
          name: risk.name, description: risk.description,
          mitigations: risk.mitigations.map(mitigation => ({ text: mitigation.text })),
        })) } : {}),
        people: ((t as any).people ?? []).map((p: any) => ({ name: p?.name ?? String(p) })),
      }))
    })),
    people: (people || []).map((p: any) => ({ name: p?.name ?? p?.text ?? String(p) })),
    exportedAt: new Date().toISOString(),
    source: 'FOMOLife export v1',
  };
}

function downloadJSON(obj: any, filename = 'export.json') {
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}