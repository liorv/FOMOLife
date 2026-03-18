import React from "react";
import TaskRow from "./TaskRow";
import type { ProjectTask } from "@myorg/types";

export interface TaskProps {
  item: ProjectTask;
  id: string;
  type: "tasks" | "people" | string;
  editorTaskId?: string | null;
  setEditorTaskId?: (taskId: string | null) => void;
  handleToggle?: (taskId: string) => void;
  handleStar?: (taskId: string) => void;
  handleDelete?: (taskId: string) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
  children?: React.ReactNode;
  onDragStart?: (taskId: string, e: React.DragEvent) => void;
  onDragOver?: (taskId: string, e: React.DragEvent) => void;
  onDrop?: (taskId: string, e: React.DragEvent) => void;
  onDragEnd?: (taskId: string, e: React.DragEvent) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<ProjectTask>) => void;
  newlyAddedTaskId?: string | null;
  onClearNewTask?: () => void;
}

export default function Task({
item,
  id,
  type,
  editorTaskId,
  setEditorTaskId,
  handleToggle,
  handleStar,
  handleDelete,
  onTitleChange,
  children,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onTaskUpdate,
  newlyAddedTaskId = null,
  onClearNewTask = () => {},
}: TaskProps) {
  return (
    <li
      data-task-id={id}
      className={`${item.done ? "done" : ""}${type === "tasks" && (editorTaskId ?? null) === id ? " is-editing" : ""}`}
      draggable={type === "tasks"}
      onDragStart={(e) => {
        // Stop bubbling so the SubprojectEditor wrapper's onDragStart
        // doesn't overwrite dataTransfer with { subprojectId }.
        e.stopPropagation();
        try {
          e.dataTransfer.setData(
            "application/json",
            JSON.stringify({ taskId: id })
          );
        } catch (_) {}
        onDragStart && onDragStart(id, e);
      }}
      onDragOver={(e) => {
        if (type === "tasks") {
          e.preventDefault();
          onDragOver && onDragOver(id, e);
        }
      }}
      onDrop={(e) => {
        if (type === "tasks") {
          e.preventDefault();
          // Stop bubbling so the SubprojectEditor wrapper's onDrop
          // doesn't also fire and cause a double-move.
          e.stopPropagation();
          onDrop && onDrop(id, e);
        }
      }}
      onDragEnd={(e) => {
        onDragEnd && onDragEnd(id, e);
      }}
    >
      <div className="task-header">
        <TaskRow
          item={item}
          id={id}
          type={type}
          editorTaskId={editorTaskId ?? null}
          {...(setEditorTaskId !== undefined && { setEditorTaskId })}
          {...(handleToggle !== undefined && { handleToggle })}
          {...(handleStar !== undefined && { handleStar })}
          {...(handleDelete !== undefined && { handleDelete })}
          {...(onTitleChange !== undefined && { onTitleChange })}
          {...(onTaskUpdate !== undefined && { onTaskUpdate })}
          newlyAddedTaskId={newlyAddedTaskId}
          onClearNewTask={onClearNewTask}
        />
      </div>

      {children}
    </li>
  );
}