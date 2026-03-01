/**
 * TaskList - Shared task list component
 * 
 * A simplified task list renderer for displaying and interacting with tasks.
 * This is a shared component that can be used across tasks and projects apps.
 */

import React from 'react';
import type { TaskItem } from '@myorg/types';

export interface TaskListProps {
  /** The items to render (tasks) */
  items: TaskItem[];
  /** Currently editing task ID (for inline editor) */
  editorTaskId?: string | null;
  /** Callback to set the editing task ID */
  setEditorTaskId?: (taskId: string | null) => void;
  /** Callback when task toggle is clicked */
  handleToggle?: (taskId: string) => void;
  /** Callback when task star/favorite is clicked */
  handleStar?: (taskId: string) => void;
  /** Callback when task is deleted */
  handleDelete?: (taskId: string) => void;
  /** Callback when task title is changed */
  onTitleChange?: (taskId: string, newTitle: string) => void;
  /** Drag and drop handlers */
  onDragStart?: (taskId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (taskId: string) => void;
  onDragEnd?: () => void;
  /** Recently added task ID (for highlighting) */
  newlyAddedTaskId?: string | null;
  /** Callback to clear newly added task */
  onClearNewTask?: () => void;
  /** Render function for custom task item rendering */
  renderItem?: (item: TaskItem) => React.ReactNode;
}

export default function TaskList({
  items,
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
  newlyAddedTaskId,
  onClearNewTask,
  renderItem,
}: TaskListProps) {
  const handleTaskClick = (taskId: string) => {
    if (setEditorTaskId) {
      setEditorTaskId(editorTaskId === taskId ? null : taskId);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
    e.stopPropagation();
    if (handleToggle) {
      handleToggle(taskId);
    }
  };

  const handleStarClick = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (handleStar) {
      handleStar(taskId);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (handleDelete) {
      handleDelete(taskId);
    }
  };

  const handleDragStartItem = (e: React.DragEvent, taskId: string) => {
    if (onDragStart) {
      onDragStart(taskId);
    }
  };

  const handleDropItem = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    if (onDrop) {
      onDrop(taskId);
    }
  };

  const handleDragOverItem = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDragOver) {
      onDragOver(e);
    }
  };

  // Clear newly added highlight after a delay
  React.useEffect(() => {
    if (newlyAddedTaskId && onClearNewTask) {
      const timer = setTimeout(() => {
        onClearNewTask();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedTaskId, onClearNewTask]);

  if (renderItem) {
    return <>{items.map((item) => renderItem(item))}</>;
  }

  return (
    <>
      {items.map((item) => {
        const isEditing = editorTaskId === item.id;
        const isNewlyAdded = newlyAddedTaskId === item.id;

        return (
          <li
            key={item.id}
            className={`task-item ${isEditing ? 'task-item--editing' : ''} ${isNewlyAdded ? 'task-item--newly-added' : ''}`}
            onClick={() => handleTaskClick(item.id)}
            draggable={!!onDragStart}
            onDragStart={(e) => handleDragStartItem(e, item.id)}
            onDragOver={handleDragOverItem}
            onDrop={(e) => handleDropItem(e, item.id)}
            onDragEnd={onDragEnd}
          >
            <div className="task-item__checkbox">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => handleCheckboxChange(e, item.id)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="task-item__content">
              <span className={`task-item__text ${item.done ? 'task-item__text--done' : ''}`}>
                {item.text}
              </span>
              {item.description && (
                <span className="task-item__description">{item.description}</span>
              )}
              {item.dueDate && (
                <span className="task-item__due-date">{item.dueDate}</span>
              )}
            </div>

            <div className="task-item__actions">
              <button
                className={`task-item__star ${item.favorite ? 'task-item__star--active' : ''}`}
                onClick={(e) => handleStarClick(e, item.id)}
                title={item.favorite ? 'Unstar' : 'Star'}
              >
                {item.favorite ? '★' : '☆'}
              </button>
              <button
                className="task-item__delete"
                onClick={(e) => handleDeleteClick(e, item.id)}
                title="Delete"
              >
                ×
              </button>
            </div>
          </li>
        );
      })}
    </>
  );
}
