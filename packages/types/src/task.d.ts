/**
 * TaskItem - Core task entity
 *
 * Represents a single task in the FOMO Life system.
 * This type is shared across tasks, projects, and framework apps.
 */
export interface TaskItem {
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
    /** Extended description/notes for the task */
    description: string;
    /** Assigned people (project-style) */
    people?: import("./project").ProjectTaskPerson[];
}
/**
 * TaskFilter - Available filter types for task lists
 */
export type TaskFilter = 'completed' | 'overdue' | 'upcoming' | 'starred';
/**
 * TaskCreateInput - Input for creating a new task
 */
export interface TaskCreateInput {
    text: string;
    dueDate?: string | null;
    favorite?: boolean;
    description?: string;
    people?: import("./project").ProjectTaskPerson[];
}
/**
 * TaskUpdateInput - Input for updating an existing task
 */
export interface TaskUpdateInput {
    text?: string;
    done?: boolean;
    dueDate?: string | null;
    favorite?: boolean;
    description?: string;
    people?: import("./project").ProjectTaskPerson[];
}
//# sourceMappingURL=task.d.ts.map