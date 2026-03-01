import React from "react";
import Task from "./Task";
import Person from "./Person";
import TaskEditor from "./TaskModal";
import type { Contact } from "@myorg/types";
import type { ProjectTask } from "@myorg/types";

type ListItem = ProjectTask | Contact;

export interface TaskListProps {
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
}

export default function TaskList({
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
}: TaskListProps) {
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

        // task list row; we render the <Task /> component which itself
        // contains the <li>. when editing we pass the editor as children so
        // the task can display an expandable pane within the same list item.
        const taskItem = item as ProjectTask;
        const row = (
          <Task
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
          />
        );

        if (type === "tasks" && editorTaskId === id) {
          // render the task row with the editor nested inside the same <li>
          const editor = (
            <div key={`${id}-editor`} className="task-editor-wrapper">
              <TaskEditor
                task={taskItem}
                onSave={onEditorSave ?? ((_task: ProjectTask) => {})}
                {...(onEditorUpdate !== undefined && { onUpdateTask: (task) => onEditorUpdate(task.id, task) })}
                onClose={onEditorClose ?? (() => {})}
                allPeople={allPeople}
                {...(onOpenPeople !== undefined && { onOpenPeople })}
                {...(onCreatePerson !== undefined && { onCreatePerson: (person) => onCreatePerson!(person.name) })}
                inline={true}
              />
            </div>
          );
          return (
            <Task
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
            >
              {editor}
            </Task>
          );
        }

        return row;
      })}
    </>
  );
}
