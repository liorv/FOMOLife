/**
 * Project Types - Core project entities
 * 
 * Represents projects, subprojects, and related types in the FOMO Life system.
 * This type is shared across projects, tasks, and framework apps.
 */

/**
 * ProjectTaskPerson - Person assigned to a project task
 */
export interface ProjectTaskPerson {
  /** Person's display name */
  name: string;
}

/**
 * A task risk is unmitigated until at least one mitigation is recorded.
 */
export interface ProjectRisk {
  id: string;
  name: string;
  description: string;
  mitigations: { id: string; text: string }[];
}

export type ProjectTaskStatus = 'not_started' | 'on_track' | 'blocked' | 'in_progress' | 'complete';
/** on_track in ProjectTaskStatus is retained only for legacy reports. */
export type ProjectScheduleHealth = 'on_track' | 'behind';
export interface ProjectTaskStatusNote { id: string; text: string }

export interface ProjectStatusSnapshot {
  /** Calendar date in UTC; one snapshot per project per date. */
  date: string;
  updatedAt: string;
  updatedBy: string;
  projectName: string;
  status: ProjectTaskStatus;
  scheduleHealth?: ProjectScheduleHealth | null;
  forecast?: {
    earliestFinish: string | null;
    delayDays: number;
    missingEffort: number;
    error: string | null;
    deadlines: { label: string; date: string; daysLate: number }[];
  };
  summary: string;
  tasks: {
    id: string;
    text: string;
    sectionId: string;
    section: string;
    status: ProjectTaskStatus;
    eligible: boolean;
    scheduleHealth?: ProjectScheduleHealth | null;
    inheritedBehind?: boolean;
    statusUpdates?: ProjectTaskStatusNote[];
    delayDays?: number;
  }[];
  impact: {
    blockedTasks: { id: string; text: string }[];
    behindTasks?: { id: string; text: string }[];
    downstreamTasks: { id: string; text: string }[];
    milestones: { id: string; label: string }[];
    deadlines: { id: string; label: string; date: string }[];
  };
}

/**
 * ProjectTask - Task within a project or subproject
 */
export interface ProjectTask {
  /** Unique identifier for the task */
  id: string;
  /** Task title/description */
  text: string;
  /** Whether the task is completed */
  done: boolean;
  status?: ProjectTaskStatus;
  scheduleHealth?: ProjectScheduleHealth | null;
  statusUpdates?: ProjectTaskStatusNote[];
  delayDays?: number;
  /** Due date in ISO 8601 format, or null if not set */
  dueDate: string | null;
  /** Repeat cadence; completing the task creates its next occurrence */
  recurrence?: import('./task').TaskRecurrence | null;
  /** Original due date anchoring monthly and yearly recurrence schedules */
  recurrenceAnchorDate?: string | null;
  /** Whether the task is marked as favorite/starred */
  favorite: boolean;
  /** Legacy alias used in some components */
  starred?: boolean;
  /** Extended description/notes for the task */
  description?: string;
  risks?: ProjectRisk[];
  /** People assigned to this task */
  people: ProjectTaskPerson[];
  effort?: number | null;
  /** ISO 8601 timestamp of task creation; absent on legacy tasks */
  createdAt?: string;
  /** ISO 8601 timestamp of the latest completion, or null when reopened */
  completedAt?: string | null;
}

/**
 * ProjectSubproject - Subproject within a project
 */
export interface ProjectSubproject {
  /** Unique identifier for the subproject */
  id: string;
  /** Subproject title */
  text: string;
  /** Tasks within this subproject */
  tasks: ProjectTask[];
  /** Whether the subproject is collapsed in the UI */
  collapsed?: boolean;
  /** Whether this is the project-level task container */
  isProjectLevel?: boolean;
  /** Color for the subproject (hex code) */
  color?: string;
  /** Extended description */
  description?: string;
  /** Owners of this subproject */
  owners?: ProjectTaskPerson[];
  /** Saved sort mode for this subproject */
  sortMode?: 'none' | 'due_date' | 'alphabetical';
}

/**
 * ProjectMember - A user who is a member of a project
 */
export interface ProjectMember {
  /** User ID of the member */
  userId: string;
  /** Display name */
  name: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Optional role label (unused by app logic — all members are equal) */
  role?: string;
}

export interface ProjectMilestone {
  id: string;
  label: string;
  taskIds: string[];
  sectionIds?: string[];
}

export interface ProjectDeadline {
  id: string;
  label: string;
  /** Calendar date, YYYY-MM-DD; independent of task scheduling. */
  date: string;
}

/**
 * ProjectItem - Core project entity
 */
export interface ProjectItem {
  /** Unique identifier for the project */
  id: string;
  /** Recorded creation time; absent for legacy projects */
  createdAt?: string;
  /** Project title */
  text: string;
  /** Color for the project (hex code) */
  color: string;
  /** Subprojects within this project */
  subprojects: ProjectSubproject[];
  /** Isolated Plan-view links; task completion does not enforce these yet. */
  planningLinks?: {
    prerequisite: { kind: 'task' | 'section'; id: string };
    dependent: { kind: 'task' | 'section'; id: string };
  }[];
  milestones?: ProjectMilestone[];
  deadlines?: ProjectDeadline[];
  statusHistory?: ProjectStatusSnapshot[];
  /** Progress percentage (0-100) */
  progress?: number;
  /** Sort order */
  order?: number;
  /** Project goal */
  goal?: string;
  /** Project description */
  description?: string;
  /** External HTTP/HTTPS link attached to the project */
  externalUrl?: string;
  /** Due date/deadline for the entire project */
  dueDate?: string | null;
  /** Special instructions for AI when reviewing the project */
  aiInstructions?: string;
  /** Project avatar/picture URL */
  avatarUrl?: string;
  /** ID of the user who created this project */
  creatorId?: string;
  /** Members of this project (owner + invited members) */
  members?: ProjectMember[];
  /** Whether this project is archived (marked complete) */
  archived?: boolean;
  /** Timestamp when the project was archived, if applicable */
  archivedAt?: string | null;
  /** Reusable project definition, excluded from active work and reminders */
  isTemplate?: boolean;
  /** Persisted UI preferences for this project */
  preferences?: {
    /** Whether to show completed tasks (default: false = hide them) */
    showCompleted?: boolean;
    /** Active filter keys for this project */
    activeFilters?: string[];
  };
}

/**
 * ProjectCreateInput - Input for creating a new project
 */
export interface ProjectCreateInput {
  text: string;
  isTemplate?: boolean;
  /** Accessible template to instantiate; its content is copied server-side */
  templateId?: string;
  color?: string;
  progress?: number;
  order?: number;
  subprojects?: ProjectSubproject[];
  planningLinks?: NonNullable<ProjectItem['planningLinks']>;
  milestones?: ProjectMilestone[];
  deadlines?: ProjectDeadline[];
  goal?: string;
  description?: string;
  externalUrl?: string;
  dueDate?: string | null;
  aiInstructions?: string;
  avatarUrl?: string;
  members?: ProjectMember[];
  preferences?: {
    showCompleted?: boolean;
    activeFilters?: string[];
  };
}

/**
 * ProjectUpdateInput - Input for updating an existing project
 */
export interface ProjectUpdateInput {
  taskStatusUpdate?: { taskId: string; status: ProjectTaskStatus };
  taskScheduleUpdate?: { taskId: string; health: ProjectScheduleHealth };
  taskDelayUpdate?: { taskId: string; days: number };
  taskStatusNote?: { taskId: string } & (
    { action: 'add'; update: ProjectTaskStatusNote } |
    { action: 'remove'; updateId: string }
  );
  recordStatusUpdate?: boolean;
  milestones?: ProjectMilestone[];
  deadlines?: ProjectDeadline[];
  text?: string;
  isTemplate?: boolean;
  color?: string;
  subprojects?: ProjectSubproject[];
  progress?: number;
  order?: number;
  goal?: string;
  description?: string;
  externalUrl?: string;
  dueDate?: string | null;
  aiInstructions?: string;
  avatarUrl?: string;
  members?: ProjectMember[];
  archived?: boolean;
  archivedAt?: string | null;
  preferences?: {
    showCompleted?: boolean;
    activeFilters?: string[];
  };
}
