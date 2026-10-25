import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ThumbButton.module.css';
import { CheckeredFlag } from './CheckeredFlag';

export interface ThumbButtonProps {
  ariaLabel?: string;
  className?: string;
  onClick?: () => void;
  activeTab?: string;
}

export default function ThumbButton({ ariaLabel = 'Thumb', className, onClick, activeTab }: ThumbButtonProps) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isRoadmap = activeTab === 'projects' && roadmapOpen;
  const isPlan = activeTab === 'projects' && planOpen;

  useEffect(() => {
    const change = (event: Event) => {
      setRoadmapOpen((event as CustomEvent<boolean>).detail);
      setExpanded(false);
    };
    window.addEventListener('project-roadmap-active', change);
    const changePlan = (event: Event) => setPlanOpen((event as CustomEvent<boolean>).detail);
    window.addEventListener('project-plan-active', changePlan);
    return () => {
      window.removeEventListener('project-roadmap-active', change);
      window.removeEventListener('project-plan-active', changePlan);
    };
  }, []);
  useEffect(() => { setExpanded(false); }, [activeTab]);
  useEffect(() => {
    if (!expanded) return;
    menuRef.current?.querySelector('button')?.focus();
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setExpanded(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setExpanded(false); buttonRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [expanded]);

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
    if (assistantOpen) {
      iconName = 'auto_awesome'; // AI Assistant
    } else if (editorOpen) {
      iconName = 'post_add'; // Add sub project when project editor is open
    }
  } else if (activeTab === 'people') {
    iconName = 'person_add'; // Add Contact
  } else if (activeTab === 'tasks') {
    iconName = 'add'; // +
  }

  if (isRoadmap) iconName = expanded ? 'expand_more' : 'expand_less';
  else if (isPlan) iconName = 'add_link';

  return <>
    <button ref={buttonRef} type="button" className={className} aria-label={isRoadmap ? 'Roadmap actions' : isPlan ? 'Add dependency' : ariaLabel}
      aria-expanded={isRoadmap ? expanded : undefined} aria-controls={isRoadmap && expanded ? 'roadmap-fab-actions' : undefined}
      onClick={isRoadmap ? () => setExpanded(value => !value) : isPlan ? () => window.dispatchEvent(new Event('plan-add-dependency')) : onClick}>
      <span className="tabs-thumb-fab" aria-hidden="true">
        <span className="material-icons tab-icon">{iconName}</span>
      </span>
    </button>
    {isRoadmap && expanded && createPortal(<div ref={menuRef} id="roadmap-fab-actions" className={styles.actions} role="group" aria-label="Roadmap actions">
      {[
        { label: 'Add Milestone', icon: 'star', event: 'roadmap-add-milestone' },
        { label: 'Add Deadline', icon: 'flag', event: 'roadmap-add-deadline' },
      ].map(action => <button key={action.event} type="button" className={styles.action} aria-label={action.label} title={action.label}
        onClick={() => {
          setExpanded(false);
          window.dispatchEvent(new Event(action.event));
        }}>
        <span className={styles.glyph} aria-hidden="true">
          {action.icon === 'flag' ? <CheckeredFlag /> : <span className="material-icons">{action.icon}</span>}
          <span className={`material-icons ${styles.plus}`}>add</span>
        </span>
        <span className={styles.label}>{action.label}</span>
      </button>)}
    </div>, document.body)}
  </>;
}
