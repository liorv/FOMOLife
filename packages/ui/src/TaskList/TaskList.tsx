import React from "react";
import Task from "./Task";
import Person from "./Person";
import TaskEditor from "./TaskModal";
import type { Contact, TaskItem } from "@myorg/types";
import type { ProjectTask } from "@myorg/types";

/**
 * TaskList - Shared task list component
 *
 * A more fully featured renderer copied from the projects app so the same
 * behaviour can be shared across both `projects` and `tasks` apps.
 */

// list items may be project-specific tasks, generic tasks, or contacts
// (used when rendering people lists)
type ListItem = ProjectTask | TaskItem | Contact;

export interface TaskListProps {
  selectionMode?: boolean;
  selectedTaskIds?: ReadonlySet<string>;
  onSelectTask?: (taskId: string) => void;
  items?: ListItem[];
  type: "tasks" | "people" | string;
  editorTaskId?: string | null;
  setEditorTaskId?: (taskId: string | null) => void;
  handleToggle?: (taskId: string) => void;
  handleStar?: (taskId: string) => void;
  handleDelete?: (taskId: string) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
  onDragStart?: (taskId: string, e: React.DragEvent) => void;
  onDragOver?: (taskId: string, e: React.DragEvent) => void;
  onDrop?: (taskId: string, e: React.DragEvent) => void;
  onDragEnd?: (taskId: string, e: React.DragEvent) => void;
  onEditorSave?: (task: ProjectTask) => void;
  onEditorUpdate?: (taskId: string, updates: Partial<ProjectTask>) => void;
  onEditorClose?: () => void;
  allPeople?: Contact[];
  onOpenPeople?: () => void;
  onCreatePerson?: (name: string) => void;
  editingPersonId?: string | null;
  editingPersonName?: string;
  setEditingPersonId?: (id: string | null) => void;
  setEditingPersonName?: (name: string) => void;
  onSaveEdit?: (id: string, name: string) => void;
  onCancelEdit?: () => void;
  handleTogglePersonDefault?: (taskId: string) => void;
  newlyAddedTaskId?: string | null;
  onClearNewTask?: () => void;
  onChatClick?: (taskId: string) => void;
  commentCounts?: Record<string, number>;
}

export default function TaskList({
  selectionMode = false,
  selectedTaskIds,
  onSelectTask,
  items = [],
  type,
  editorTaskId,
  setEditorTaskId,
  handleToggle,
  handleStar,
  handleDelete,
  onTitleChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEditorSave,
  onEditorUpdate,
  onEditorClose,
  allPeople = [],
  onOpenPeople = () => {},
  onCreatePerson = () => {},
  editingPersonId,
  editingPersonName,
  setEditingPersonId,
  setEditingPersonName,
  onSaveEdit,
  onCancelEdit,
  handleTogglePersonDefault,
  newlyAddedTaskId = null,
  onClearNewTask = () => {},
  onChatClick,
  commentCounts,
}: TaskListProps) {
  const editingTask = type === "tasks"
    ? items.find((item) => item.id === editorTaskId) as ProjectTask | undefined
    : undefined;

  return (
    <>
      {items.map((item) => {
        const id = item.id;
        if (type === "people") {
          const contact = item as Contact;
          return (
            <Person
              key={id}
              id={id}
              person={contact}
              editingPersonId={editingPersonId ?? null}
              editingPersonName={editingPersonName ?? ""}
              {...(setEditingPersonId !== undefined && { setEditingPersonId })}
              {...(setEditingPersonName !== undefined && { setEditingPersonName })}
              {...(onSaveEdit !== undefined && { onSaveEdit })}
              {...(onCancelEdit !== undefined && { onCancelEdit })}
              {...(handleTogglePersonDefault !== undefined && { handleTogglePersonDefault })}
              {...(handleTogglePersonDefault === undefined && handleToggle !== undefined && { handleTogglePersonDefault: handleToggle })}
              {...(handleDelete !== undefined && { handleDelete })}
              asRow={true}
            />
          );
        }

        const taskItem = item as ProjectTask;
        const row = (
          <Task
            selectionMode={selectionMode}
            selected={selectedTaskIds?.has(id) ?? false}
            {...(onSelectTask ? { onSelectTask } : {})}
            key={id}
            item={taskItem}
            id={id}
            type={type}
            editorTaskId={editorTaskId ?? null}
            {...(setEditorTaskId !== undefined && { setEditorTaskId })}
            {...(handleToggle !== undefined && { handleToggle })}
            {...(handleStar !== undefined && { handleStar })}
            {...(handleDelete !== undefined && { handleDelete })}
            {...(onTitleChange !== undefined && { onTitleChange })}
            {...(onDragStart !== undefined && { onDragStart })}
            {...(onDragOver !== undefined && { onDragOver })}
            {...(onDrop !== undefined && { onDrop })}
            {...(onDragEnd !== undefined && { onDragEnd })}
            newlyAddedTaskId={newlyAddedTaskId ?? null}
            onClearNewTask={onClearNewTask}
            {...(onEditorUpdate !== undefined && { onTaskUpdate: onEditorUpdate })}
            {...(onChatClick !== undefined && { onChatClick })}
            {...(commentCounts?.[id] !== undefined && { commentCount: commentCounts[id] })}
          />
        );

        return row;
      })}
      {editingTask && !selectionMode && (
        <TaskEditor
          task={editingTask}
          onSave={onEditorSave ?? (() => {})}
          {...(onEditorUpdate !== undefined && { onUpdateTask: (task) => onEditorUpdate(task.id, task) })}
          onClose={onEditorClose ?? (() => {})}
          allPeople={allPeople}
          {...(onOpenPeople !== undefined && { onOpenPeople })}
          {...(onCreatePerson !== undefined && { onCreatePerson: (person) => onCreatePerson(person.name) })}
        />
      )}
    </>
  );
}
