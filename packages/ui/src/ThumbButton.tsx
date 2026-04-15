import React, { useEffect, useState } from 'react';

export interface ThumbButtonProps {
  ariaLabel?: string;
  className?: string;
  onClick?: () => void;
  activeTab?: string;
}

export default function ThumbButton({ ariaLabel = 'Thumb', className, onClick, activeTab }: ThumbButtonProps) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

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

  const showAssistantIcon = assistantOpen;

  let iconName = 'add';
  if (assistantOpen) {
    iconName = 'auto_awesome'; // AI Assistant
  } else if (editorOpen) {
    iconName = 'post_add'; // Add sub project when project editor is open
  } else if (activeTab === 'people') {
    iconName = 'person_add'; // Add Contact
  } else if (activeTab === 'tasks' || activeTab === 'projects') {
    iconName = 'add'; // +
  }

  return (
    <button type="button" className={className} aria-label={ariaLabel} onClick={onClick}>
      <span className="tabs-thumb-fab" aria-hidden="true">
        <span className="material-icons tab-icon">{iconName}</span>
      </span>
    </button>
  );
}
