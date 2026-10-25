import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ThumbButton.module.css';

export interface ThumbButtonProps {
  ariaLabel?: string;
  className?: string;
  onClick?: () => void;
  activeTab?: string;
}

export default function ThumbButton({ ariaLabel = 'Thumb', className, onClick, activeTab }: ThumbButtonProps) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeProjectView, setActiveProjectView] = useState<string | null>(null);
  const [taskActionsOpen, setTaskActionsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isProjectHelp = activeTab === 'projects' && ['risks', 'plan', 'roadmap'].includes(activeProjectView ?? '');
  const isProjectTasks = activeTab === 'projects' && activeProjectView === 'tasks';

  useEffect(() => {
    const change = (event: Event) => {
      setActiveProjectView((event as CustomEvent<string | null>).detail);
      setTaskActionsOpen(false);
    };
    window.addEventListener('project-view-active', change);
    return () => {
      window.removeEventListener('project-view-active', change);
    };
  }, []);
  useEffect(() => {
    if (!taskActionsOpen) return;
    menuRef.current?.querySelector('button')?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
        setTaskActionsOpen(false);
      }
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTaskActionsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [taskActionsOpen]);

  useEffect(() => {
    const openAssistant = () => setAssistantOpen(true);
    const closeAssistant = () => setAssistantOpen(false);
    const openEditor = () => setEditorOpen(true);
    const closeEditor = () => setEditorOpen(false);

    window.addEventListener('open-project-assistant', openAssistant as EventListener);
    window.addEventListener('close-project-assistant', closeAssistant as EventListener);
    window.addEventListener('project-editor-open', openEditor as EventListener);
    window.addEventListener('project-editor-close', closeEditor as EventListener);

    return () => {
      window.removeEventListener('open-project-assistant', openAssistant as EventListener);
      window.removeEventListener('close-project-assistant', closeAssistant as EventListener);
      window.removeEventListener('project-editor-open', openEditor as EventListener);
      window.removeEventListener('project-editor-close', closeEditor as EventListener);
    };
  }, []);

  let iconName = 'add';
  if (activeTab === 'projects') {
    if (isProjectHelp) {
      iconName = 'help_outline';
    } else if (assistantOpen) {
      iconName = 'auto_awesome'; // AI Assistant
    } else if (editorOpen) {
      iconName = 'post_add'; // Add sub project when project editor is open
    }
  } else if (activeTab === 'people') {
    iconName = 'person_add'; // Add Contact
  } else if (activeTab === 'tasks') {
    iconName = 'add'; // +
  }
  if (isProjectTasks) iconName = taskActionsOpen ? 'expand_more' : 'expand_less';

  const projectHelpLabel = activeProjectView === 'risks' ? 'Risk Management help'
    : activeProjectView === 'plan' ? 'Plan help' : 'Roadmap help';

  return <>
    <button ref={buttonRef} type="button" className={className}
      aria-label={isProjectHelp ? projectHelpLabel : isProjectTasks ? 'Task actions' : ariaLabel}
      aria-expanded={isProjectTasks ? taskActionsOpen : undefined}
      aria-controls={isProjectTasks && taskActionsOpen ? 'project-task-actions' : undefined}
      onClick={isProjectHelp
        ? () => {
          buttonRef.current?.focus();
          window.dispatchEvent(new CustomEvent('open-project-view-help', { detail: activeProjectView }));
        }
        : isProjectTasks ? () => setTaskActionsOpen(open => !open)
        : onClick}>
      <span className="tabs-thumb-fab" aria-hidden="true">
        <span className="material-icons tab-icon">{iconName}</span>
      </span>
    </button>
    {isProjectTasks && taskActionsOpen && createPortal(
      <div ref={menuRef} id="project-task-actions" className={styles.actions} role="group" aria-label="Task actions">
        {[
          { label: 'Add Task', icon: 'task_alt', event: 'framework-action-add-task' },
          { label: 'Add Section', icon: 'view_agenda', event: 'framework-action-add-section' },
        ].map(action => <button key={action.event} type="button" className={styles.action}
          onClick={() => {
            setTaskActionsOpen(false);
            buttonRef.current?.focus();
            window.dispatchEvent(new Event(action.event));
          }}>
          <span className={`material-icons ${styles.actionIcon}`} aria-hidden="true">{action.icon}</span>
          <span className={styles.actionLabel}>{action.label}</span>
        </button>)}
      </div>, document.body,
    )}
  </>;
}
