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
 * ProjectTask - Task within a project or subproject
 */
export interface ProjectTask {
  /** Unique identifier for the task */
  id: string;
  /** Task title/description */
  text: string;
  /** Whether the task is completed */
  done: boolean;
  /** Due date in ISO 8601 format, or null if not set */
  dueDate: string | null;
  /** Whether the task is marked as favorite/starred */
  favorite: boolean;
  /** Legacy alias used in some components */
  starred?: boolean;
  /** Extended description/notes for the task */
  description?: string;
  /** People assigned to this task */
  people: ProjectTaskPerson[];
  effort?: number | null;
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

/**
 * ProjectItem - Core project entity
 */
export interface ProjectItem {
  /** Unique identifier for the project */
  id: string;
  /** Project title */
  text: string;
  /** Color for the project (hex code) */
  color: string;
  /** Subprojects within this project */
  subprojects: ProjectSubproject[];
  /** Progress percentage (0-100) */
  progress?: number;
  /** Sort order */
  order?: number;
  /** Project goal */
  goal?: string;
  /** Project description */
  description?: string;
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
}

/**
 * ProjectCreateInput - Input for creating a new project
 */
export interface ProjectCreateInput {
  text: string;
  color?: string;
  goal?: string;
  description?: string;
  dueDate?: string | null;
  aiInstructions?: string;
  avatarUrl?: string;
  members?: ProjectMember[];
}

/**
 * ProjectUpdateInput - Input for updating an existing project
 */
export interface ProjectUpdateInput {
  text?: string;
  color?: string;
  subprojects?: ProjectSubproject[];
  progress?: number;
  order?: number;
  goal?: string;
  description?: string;
  dueDate?: string | null;
  aiInstructions?: string;
  avatarUrl?: string;
  members?: ProjectMember[];
}
