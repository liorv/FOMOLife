'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ModalOverlay } from '@myorg/ui';
import styles from './ProjectViewHelp.module.css';

type ProjectView = 'risks' | 'plan' | 'roadmap' | 'status';

const helpContent: Record<ProjectView, {
  title: string;
  icon: string;
  steps: { icon: string; title: string; description: string }[];
}> = {
  status: {
    title: 'Project Status',
    icon: 'fact_check',
    steps: [
      { icon: 'filter_alt', title: 'Review ready work', description: 'Completed tasks and tasks with no incomplete task prerequisites.' },
      { icon: 'edit', title: 'Update status', description: 'Set work status and active-task schedule health. Behind is inherited by unfinished dependent tasks.' },
      { icon: 'event', title: 'Forecast delivery', description: 'Effort is remaining calendar days. Enter delay days for Behind tasks to forecast the earliest finish and check project deadlines.' },
      { icon: 'history', title: 'Compare dates', description: 'Select a task row to add text updates on Enter or remove them. Daily snapshots preserve statuses and notes; select a date to review it.' },
    ],
  },
  risks: {
    title: 'Risk Management',
    icon: 'warning',
    steps: [
      { icon: 'filter_alt', title: 'Filter', description: 'All · Mitigated · Unmitigated' },
      { icon: 'ads_click', title: 'Choose a task', description: 'Select its row.' },
      { icon: 'healing', title: 'Add a fix', description: 'Select a risk, add a mitigation.' },
    ],
  },
  plan: {
    title: 'Project Plan',
    icon: 'account_tree',
    steps: [
      { icon: 'ads_click', title: 'Choose a task', description: 'Select a row.' },
      { icon: 'add_link', title: 'Connect tasks', description: 'Use the link button.' },
      { icon: 'task_alt', title: 'Check the order', description: 'Prerequisites come first.' },
    ],
  },
  roadmap: {
    title: 'Project Roadmap',
    icon: 'timeline',
    steps: [
      { icon: 'view_timeline', title: 'See the schedule', description: 'Bars show task dates.' },
      { icon: 'swap_horiz', title: 'Change the view', description: 'Project or person.' },
      { icon: 'event', title: 'Track key dates', description: 'Milestones and deadlines.' },
    ],
  },
};

export default function ProjectViewHelp({ view }: { view: ProjectView }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const content = helpContent[view];

  useEffect(() => {
    const handleOpen = (event: Event) => {
      if ((event as CustomEvent<ProjectView>).detail !== view) return;
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
    };
    window.addEventListener('open-project-view-help', handleOpen);
    return () => window.removeEventListener('open-project-view-help', handleOpen);
  }, [view]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
    else triggerRef.current?.focus();
  }, [open]);

  return (
    <ModalOverlay open={open} onClose={() => setOpen(false)} ariaLabelledby={titleId}
      className={styles.overlay} contentClassName={styles.dialog}>
      <div onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          setOpen(false);
        } else if (event.key === 'Tab') {
          event.preventDefault();
          closeRef.current?.focus();
        }
      }}>
        <div className={styles.heading}>
          <span className={styles.pageIcon} aria-hidden="true">
            <span className="material-icons">{content.icon}</span>
          </span>
          <div>
            <h3 id={titleId}>{content.title}</h3>
            <p>Quick guide</p>
          </div>
          <button ref={closeRef} className={styles.close} type="button" aria-label="Close" onClick={() => setOpen(false)}>
            <span className="material-icons" aria-hidden="true">close</span>
          </button>
        </div>
        <ol className={styles.steps}>
          {content.steps.map((step, index) => <li key={step.title}>
            <span className={styles.stepIcon} aria-hidden="true">
              <span className="material-icons">{step.icon}</span>
            </span>
            <span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>
            <span className={styles.stepText}>
              <strong>{step.title}</strong>
              <span>{step.description}</span>
            </span>
            {index < content.steps.length - 1 && <span className={`material-icons ${styles.arrow}`} aria-hidden="true">arrow_downward</span>}
          </li>)}
        </ol>
        <div className={styles.footer}>
          <span className="material-icons" aria-hidden="true">lightbulb</span>
          <span>Need more detail? Explore the page controls.</span>
        </div>
      </div>
    </ModalOverlay>
  );
}
