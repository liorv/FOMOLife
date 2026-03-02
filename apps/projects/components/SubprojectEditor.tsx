import React, { useState, useMemo, useEffect, useRef } from "react";
import { TaskList } from "@myorg/ui";
import { AddBar } from "@myorg/ui";
import { SubprojectRow } from "@myorg/ui";
import { applyFilters } from '@myorg/utils';
import type { ProjectSubproject, ProjectItem, ProjectTask, Contact } from "@myorg/types";
import type { TaskFilter } from "@myorg/types";

interface SubprojectEditorProps {
  sub: ProjectSubproject;
  project: ProjectItem;
  editorTaskId?: string | null;
  setEditorTaskId: (taskId: string | null) => void;
  onDelete: () => void;
  onUpdateText: (text: string) => void;
  onUpdateColor: (color: string) => void;
  onToggleCollapse: () => void;
  onAddTask: (text: string, favorite?: boolean) => void;
  handleTaskToggle: (taskId: string) => void;
  handleTaskStar: (taskId: string) => void;
  handleTaskDelete: (taskId: string) => void;
  onDragStart?: (taskId: string, e: React.DragEvent) => void;
  onDragOver?: (taskId: string, e: React.DragEvent) => void;
  onDrop?: (taskId: string, e: React.DragEvent) => void;
  onDragEnd?: (taskId: string, e: React.DragEvent) => void;
  onDragOverSubprojectTile?: () => void;
  onDragLeaveSubprojectTile?: () => void;
  onDropOnSubprojectTile?: (e: React.DragEvent) => void;
  isDragOverSubprojectTile?: boolean;
  onEditorSave: (task: ProjectTask) => void;
  onEditorUpdate: (taskId: string, updates: Partial<ProjectTask>) => void;
  onEditorClose: () => void;
  allPeople: Contact[];
  onOpenPeople?: () => void;
  onCreatePerson?: (name: string) => void;
  onTaskTitleChange?: (taskId: string, newTitle: string) => void;
  autoEdit?: boolean;
  newlyAddedTaskId?: string | null;
  onClearNewTask?: () => void;
  onReorder?: (fromId: string, toId: string) => void;
  isDragging?: boolean;
  taskFilters?: TaskFilter[];
}

export default function SubprojectEditor({
  sub,
  project,
  editorTaskId,
  setEditorTaskId,
  onDelete,
  onUpdateText,
  onUpdateColor,
  onToggleCollapse,
  onAddTask,
  handleTaskToggle,
  handleTaskStar,
  handleTaskDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDragOverSubprojectTile = () => {},
  onDragLeaveSubprojectTile = () => {},
  onDropOnSubprojectTile = () => {},
  isDragOverSubprojectTile = false,
  onEditorSave,
  onEditorUpdate,
  onEditorClose,
  allPeople,
  onOpenPeople,
  onCreatePerson,
  onTaskTitleChange,
  autoEdit = false,
  newlyAddedTaskId = null,
  onClearNewTask = () => {},
  onReorder = () => {},
  isDragging = false,
  taskFilters = [],
}: SubprojectEditorProps) {
  // Apply filter to the task list if one is active
  const visibleTasks = useMemo(() => {
    // filters do not consider searchQuery in this component; helper is still usable
    // Cast through any to handle type mismatch between ProjectTask and TaskItem
    const tasks = sub.tasks || [];
    return applyFilters(tasks as any, taskFilters, "") as ProjectTask[];
  }, [sub.tasks, JSON.stringify(taskFilters)]);

  const collapsed = sub.collapsed;

  // local state for the inline add-bar that appears when subproject is
  // expanded; users can type a task and hit enter or press the button to
  // create it.  this replaces the previous floating-action approach.
  const [newTaskText, setNewTaskText] = useState("");
  const addBarRef = useRef<HTMLDivElement>(null);

  // --- Subproject drag/drop ---

  const handleSubDragStart = (e: React.DragEvent) => {
    try {
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/json", JSON.stringify({
          subprojectId: sub.id,
        }));
      }
    } catch (err) {
      // dataTransfer might not be available in test environment
    }
  };

  const handleSubDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
    } catch (err) {
      // dataTransfer might not be available
    }
  };

  const handleSubDrop = (e: React.DragEvent) => {
    e.preventDefault();
    let data = "";
    try {
      data = e.dataTransfer?.getData("application/json") || "";
    } catch (err) {
      return;
    }

    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.subprojectId && parsed.subprojectId !== sub.id) {
        // ── Subproject reorder ─────────────────────────────────
        onReorder(parsed.subprojectId, sub.id);
      } else if (parsed.taskId) {
        // ── Task dropped onto a subproject header / tile ───────
        // Delegate to the same handler used by collapsed-tile drops
        // so the task is moved into this subproject.
        if (onDropOnSubprojectTile) onDropOnSubprojectTile(e);
      }
    } catch (err) {
      // Silently handle parse errors
    }
  };

  // --- Render ---

  const wrapperClass =
    "subproject" +
    (collapsed ? " collapsed" : "") +
    (!collapsed ? " expanded" : "");

  // focus input when subproject expands
  useEffect(() => {
    if (!collapsed && addBarRef.current) {
      const input = addBarRef.current.querySelector('input');
      if (input) input.focus();
    }
  }, [collapsed]);

  return (
    <div
      className={wrapperClass}
      draggable
      onDragStart={handleSubDragStart}
      onDragOver={handleSubDragOver}
      onDrop={handleSubDrop}
      style={{ 
        opacity: isDragging ? 0.5 : 1, 
        overflow: 'visible',
        /* keep white background by default; only tint when dragging-over */
        backgroundColor: isDragOverSubprojectTile ? 'rgba(0, 0, 0, 0.02)' : '#fff',
        borderLeft: isDragOverSubprojectTile ? '3px solid #1a73e8' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {/* header row is always present; expanded prop toggles collapse icon */}
      <SubprojectRow
        sub={sub}
        project={project}
        onEdit={onToggleCollapse}
        onNameChange={(newName: string) => onUpdateText(newName)}
        onColorChange={(_id: string, color: string) => onUpdateColor(color)}
        onDelete={onDelete}
        onDragOverSubprojectTile={onDragOverSubprojectTile}
        onDragLeaveSubprojectTile={onDragLeaveSubprojectTile}
        onDropOnSubprojectTile={onDropOnSubprojectTile}
        isDragOverSubprojectTile={isDragOverSubprojectTile}
        autoEdit={autoEdit}
        isDragging={isDragging}
        expanded={!collapsed}
      />
      {!collapsed && <div className="subproject-body">
        <div className="subproject-tasks">
          <ul className="item-list">
            <TaskList
              {...{
                items: visibleTasks as any,
                type: "tasks",
                editorTaskId: editorTaskId ?? null,
                setEditorTaskId,
                handleToggle: handleTaskToggle,
                handleStar: handleTaskStar,
                handleDelete: handleTaskDelete,
                onTitleChange: onTaskTitleChange,
                onDragStart,
                onDragOver,
                onDrop,
                onDragEnd,
                onEditorSave,
                onEditorUpdate,
                onEditorClose,
                allPeople,
                onOpenPeople,
                onCreatePerson,
                newlyAddedTaskId: newlyAddedTaskId ?? null,
                onClearNewTask,
              } as any}
            />
          </ul>
          {/* add-bar appears as last row when expanded; handles its own state */}
          <div className="add-bar-wrapper" ref={addBarRef}>
            <AddBar
              type="tasks"
              input={newTaskText}
              onInputChange={setNewTaskText}
              onAdd={() => {
                if (newTaskText.trim() !== "") {
                  onAddTask(newTaskText, false);
                  setNewTaskText("");
                }
              }}
            />
          </div>
        </div>
      </div>}
    </div>
  );
}
