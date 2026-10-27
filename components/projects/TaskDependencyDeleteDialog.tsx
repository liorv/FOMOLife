'use client';

import React, { useEffect, useRef } from 'react';
import { ModalOverlay } from '@myorg/ui';
import type { ProjectTask } from '@myorg/types';
import { planKey, type PlanLink, type PlanNode } from '@/lib/projects/planning';
import styles from './TaskDependencyDeleteDialog.module.css';

interface Props {
  task: ProjectTask;
  links: PlanLink[];
  nodes: PlanNode[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TaskDependencyDeleteDialog({ task, links, nodes, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const byKey = new Map(nodes.map(node => [node.key, node]));
  const label = (ref: PlanLink['prerequisite']) => {
    if (ref.kind === 'task' && ref.id === task.id) return task.text || 'Untitled task';
    return byKey.get(planKey(ref))?.text ?? 'Missing item';
  };

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <ModalOverlay
      open
      onClose={onCancel}
      className={styles.overlay}
      contentClassName={styles.dialog}
      contentRef={dialogRef}
      ariaLabelledby="task-dependency-delete-title"
    >
      <div onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:enabled');
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}>
        <header className={styles.header}>
          <span className={`material-icons ${styles.icon}`} aria-hidden="true">warning_amber</span>
          <div>
            <h2 id="task-dependency-delete-title">Remove task and dependencies?</h2>
            <p><strong>{task.text || 'Untitled task'}</strong> is linked in the project plan. Removing it will also remove these links.</p>
          </div>
        </header>
        <ul className={styles.links} aria-label="Dependencies that will be removed">
          {links.map((link, index) => (
            <li key={`${link.prerequisite.kind}:${link.prerequisite.id}-${link.dependent.kind}:${link.dependent.id}-${index}`}>
              <span><strong>{label(link.dependent)}</strong> depends on <strong>{label(link.prerequisite)}</strong></span>
            </li>
          ))}
        </ul>
        <p className={styles.hint}>Other tasks and sections will remain unchanged. You can cancel to keep the task and its links.</p>
        <footer className={styles.actions}>
          <button ref={cancelRef} type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
          <button type="button" className={styles.remove} onClick={onConfirm}>Remove task and links</button>
        </footer>
      </div>
    </ModalOverlay>
  );
}
