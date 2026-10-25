import React, { useEffect, useRef, useState } from 'react';

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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isProjectHelp = activeTab === 'projects' && ['risks', 'plan', 'roadmap'].includes(activeProjectView ?? '');

  useEffect(() => {
    const change = (event: Event) => setActiveProjectView((event as CustomEvent<string | null>).detail);
    window.addEventListener('project-view-active', change);
    return () => {
      window.removeEventListener('project-view-active', change);
    };
  }, []);

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

  const projectHelpLabel = activeProjectView === 'risks' ? 'Risk Management help'
    : activeProjectView === 'plan' ? 'Plan help' : 'Roadmap help';

  return <button ref={buttonRef} type="button" className={className}
      aria-label={isProjectHelp ? projectHelpLabel : ariaLabel}
      onClick={isProjectHelp
        ? () => {
          buttonRef.current?.focus();
          window.dispatchEvent(new CustomEvent('open-project-view-help', { detail: activeProjectView }));
        }
        : onClick}>
      <span className="tabs-thumb-fab" aria-hidden="true">
        <span className="material-icons tab-icon">{iconName}</span>
      </span>
    </button>;
}
